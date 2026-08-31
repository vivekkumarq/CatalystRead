---
title: "Spring's Caching Annotations: Where They Bite"
slug: "spring-caching-annotations-sharp-edges"
description: "The gap between what @Cacheable looks like it does and what it actually does, including key collisions, exception handling, and self-invocation."
publishedAt: "2025-03-11"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Caching
  - Performance
---

`@Cacheable` reads like a solved problem: annotate a method, get caching for free. It mostly works that way, right up until a subtle default catches you — a shared cache key across overloaded methods, a cached exception nobody expected, or a cache write that silently never happens because of the same proxy limitation that trips up `@Transactional`.

## The Proxy Problem, Again

Like `@Transactional`, Spring's caching abstraction is implemented with a proxy around your bean. Calling a `@Cacheable` method from another method on the same bean bypasses the proxy and the cache entirely.

```java
@Service
public class ProductService {

    public ProductDto lookupForDisplay(Long id) {
        return getProduct(id); // bypasses the cache proxy
    }

    @Cacheable("products")
    public ProductDto getProduct(Long id) {
        return productRepository.findById(id)
                .map(ProductMapper::toDto)
                .orElseThrow();
    }
}
```

If you see cache hit rates far lower than expected, check for exactly this pattern before assuming the cache configuration is broken.

## Keys Are Not as Obvious as They Look

By default, `SimpleKeyGenerator` builds a key from the method's arguments. That's fine for a single-argument method, but it gets dangerous fast with overloaded methods or multiple parameters, because two different methods on the same cache name with the same argument types can collide.

```java
@Cacheable(value = "products", key = "#id + '-' + #currency")
public ProductDto getProduct(Long id, String currency) {
    return pricingClient.priceFor(id, currency);
}
```

Always write an explicit `key` (or `keyGenerator`) once a method takes more than one meaningful parameter, and never rely on the default when the same cache name is shared across methods with overlapping signatures — it's an easy way to serve the wrong currency's price to the wrong customer.

## Exceptions and Nulls Behave Differently Than You'd Guess

By default, `@Cacheable` does **not** cache thrown exceptions — a failed lookup will re-execute the method on every call, which is usually desired but can hammer a struggling downstream service during an outage. It also caches `null` return values by default, which is usually *not* desired: a lookup that legitimately returns nothing gets treated the same as a cached miss for the entire TTL.

```java
@Cacheable(value = "products", unless = "#result == null")
public ProductDto getProduct(Long id) {
    return productRepository.findById(id)
            .map(ProductMapper::toDto)
            .orElse(null);
}
```

`unless` runs after the method executes and can inspect the result; `condition` runs before and can inspect only the arguments. Mixing the two up is a common source of "why is this still being cached" confusion.

## Eviction Is a Design Decision, Not an Afterthought

Every `@Cacheable` needs a matching eviction strategy or it's a memory leak with a TTL as its only savior. `@CacheEvict` on the corresponding write path is the direct approach:

```java
@CacheEvict(value = "products", key = "#product.id")
public void updateProduct(Product product) {
    productRepository.save(product);
}
```

For caches backed by Redis or another external store, set an explicit TTL at the cache manager level rather than relying on `@CacheEvict` alone — writes from other services, batch jobs, or direct database changes won't go through your evict-annotated method and will leave stale entries behind indefinitely.

```yaml
spring:
  cache:
    redis:
      time-to-live: 10m
      cache-null-values: false
```

Caching pays off fastest on read-heavy, slow-changing data — reference tables, computed aggregates, third-party lookups. Applying `@Cacheable` reflexively to anything that "feels slow" without thinking through key uniqueness, null handling, and eviction is how caches become the thing on-call engineers distrust most.
