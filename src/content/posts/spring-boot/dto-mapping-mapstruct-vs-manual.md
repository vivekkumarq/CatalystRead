---
title: "DTO Mapping in Spring Boot: MapStruct vs. Hand-Written Mappers"
slug: "dto-mapping-mapstruct-vs-manual"
description: "Comparing MapStruct's generated mappers against hand-written mapping code across boilerplate, performance, and how each handles change over time."
publishedAt: "2025-09-25"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - MapStruct
  - Backend Engineering
---

Every layered Spring Boot application eventually needs to convert between entities and DTOs at the API boundary, and the debate over how to do it — a mapping library versus plain constructors and static methods — tends to generate more opinions than the actual decision deserves. Both approaches are legitimate; the right one depends mostly on how many fields you're mapping and how often the shapes on either side change independently.

## Manual Mapping: No Magic, No Surprises

A static factory method or a small mapper class with explicit field assignments is completely transparent — anyone reading it sees exactly what happens, with full IDE navigation and no generated code to reason about.

```java
public class OrderMapper {

    public static OrderDto toDto(Order order) {
        return new OrderDto(
                order.getId(),
                order.getStatus().name(),
                order.getCustomer().getEmail(),
                order.getLineItems().stream()
                        .map(OrderMapper::toLineItemDto)
                        .toList());
    }

    private static LineItemDto toLineItemDto(LineItem item) {
        return new LineItemDto(item.getProductId(), item.getQuantity(), item.getUnitPrice());
    }
}
```

This scales fine up to maybe a dozen fields and a handful of DTOs. Past that, it starts costing real time: every new field on the entity needs a matching, manually remembered line in every mapper that touches it, and nothing fails at compile time if you forget one — a forgotten field just silently doesn't show up in the response, discovered by a QA engineer or a customer rather than the compiler.

## MapStruct: Compile-Time Generated, Not Reflection-Based

MapStruct is often confused with reflection-based mapping libraries like ModelMapper or Dozer, but it works completely differently: it's an annotation processor that generates real Java mapping code at compile time. The generated code is what you'd have hand-written yourself, which means it has none of the runtime reflection overhead those other libraries carry.

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(target = "customerEmail", source = "customer.email")
    OrderDto toDto(Order order);

    LineItemDto toDto(LineItem item);
}
```

```java
@Mapper(componentModel = "spring", uses = ProductMapper.class)
public interface OrderMapper {

    @Mapping(target = "status", expression = "java(order.getStatus().name())")
    @Mapping(target = "lineItems", source = "lineItems")
    OrderDto toDto(Order order);
}
```

`componentModel = "spring"` makes the generated implementation a Spring bean you can `@Autowired` like anything else. Fields with matching names map automatically with zero code; `@Mapping` handles the exceptions — renamed fields, nested paths, computed values. The genuine advantage over manual mapping is that MapStruct fails the *build* when a target field has no matching source and no explicit mapping (with `unmappedTargetPolicy = ReportingPolicy.ERROR`), which is the compile-time safety net manual mapping doesn't have.

```java
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CustomerMapper {
    CustomerDto toDto(Customer customer);
}
```

## Where Each One Actually Wins

MapStruct earns its setup cost once you have several entities with a dozen-plus fields each, multiple DTO variants per entity (summary view, detail view, admin view), or a team large enough that "someone forgot to map a new field" is a recurring bug class rather than a hypothetical. The generated code is inspectable — it's a real `.java` file you can open in the `target/generated-sources` directory — so it doesn't cost you debuggability the way a reflection-based mapper does.

Manual mapping wins for small services, DTOs with real transformation logic that would fight the annotation-driven model anyway (conditional field inclusion based on user permissions, for instance), or when a team wants zero build-time tooling and total control over every line. Neither is wrong; the mistake is applying MapStruct reflexively to a three-field DTO, or sticking with manual mapping past the point where forgotten fields have shown up in production more than once.
