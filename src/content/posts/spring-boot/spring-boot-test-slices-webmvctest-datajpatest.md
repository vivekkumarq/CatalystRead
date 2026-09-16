---
title: "Test Slices: @WebMvcTest, @DataJpaTest, and Knowing When to Skip Them"
slug: "spring-boot-test-slices-webmvctest-datajpatest"
description: "How Spring Boot's test slice annotations work, where they save real time, and the point at which reaching for @SpringBootTest is the better call."
publishedAt: "2025-05-13"
updatedAt: "2026-09-16"
category: "Spring Boot"
tags:
  - Spring Boot
  - Testing
  - Java
  - Backend Engineering
---

`@SpringBootTest` loads the entire application context: every bean, every auto-configuration, the works. That's correct for genuine end-to-end tests, but using it as the default for every test class is the single biggest reason test suites end up taking twenty minutes to run. Test slices exist to load exactly the beans a given layer needs, and using them deliberately is one of the highest-leverage habits in a Spring codebase.

## What a Slice Actually Loads

`@WebMvcTest` boots the web layer only — controllers, `@ControllerAdvice`, filters, Jackson configuration, Bean Validation — and explicitly excludes `@Service` and `@Repository` beans. Anything a controller depends on has to be mocked.

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean OrderService orderService;

    @Test
    void returnsOrderById() throws Exception {
        when(orderService.findById(1L)).thenReturn(new OrderDto(1L, "SHIPPED"));

        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));
    }
}
```

This test starts in a fraction of a second compared to a full context, because Hibernate, the connection pool, and every unrelated `@Service` never get instantiated. It's also a more honest unit test of the controller: it verifies request mapping, serialization, and validation without pretending to test the service layer at the same time.

`@DataJpaTest` does the mirror image for persistence — it configures an embedded database (or a Testcontainers-backed real one, with the right setup), `@Entity` scanning, and Spring Data repositories, while skipping the web layer and most `@Service` beans entirely.

```java
@DataJpaTest
class OrderRepositoryTest {

    @Autowired TestEntityManager entityManager;
    @Autowired OrderRepository orderRepository;

    @Test
    void findsOrdersByStatus() {
        entityManager.persist(new Order("SHIPPED"));
        entityManager.persist(new Order("PENDING"));

        List<Order> shipped = orderRepository.findByStatus("SHIPPED");

        assertThat(shipped).hasSize(1);
    }
}
```

By default `@DataJpaTest` uses an in-memory database and rolls back each test in a transaction, which is fast but means it isn't exercising the actual SQL dialect your production database speaks — a query that works on H2 can fail on Postgres. Pairing it with `@Testcontainers` and a real Postgres container closes that gap at a modest cost in startup time.

## Where Slices Stop Making Sense

Slices earn their keep when a test genuinely only needs one layer. They stop being useful — and start actively hiding bugs — once a test's real purpose is to verify that layers work *together*: that a request through the full filter chain, into a real service, hitting a real transaction boundary, produces the right database state. Mocking the service in a `@WebMvcTest` can't catch a bug where the controller and service disagree about who owns validation, or where a `@Transactional` boundary is in the wrong place.

A reasonable rule of thumb: use `@WebMvcTest` and `@DataJpaTest` for the bulk of your test suite, where each test has a narrow, single-layer responsibility, and reserve a smaller number of `@SpringBootTest(webEnvironment = RANDOM_PORT)` tests for the critical paths that need to prove the whole stack is wired correctly — checkout, authentication, payment capture. If most of your test suite is full-context tests "just to be safe," you're paying the startup cost on every test without getting proportionally more confidence, and the suite's runtime will eventually train the team to run it less often, which defeats the point of having it.

## A worked example

`@WebMvcTest(OrderController.class)` + `@MockBean OrderService` tests JSON and status. `@DataJpaTest` + Testcontainers tests a repository query. One `@SpringBootTest` smoke loads the context. You do not use `@SpringBootTest` for every controller assertion.

`@Import` a security test config so slices still have the filter chain you care about.

## Failure modes

Slices that miss a converter and pass in full tests only. `@MockBean` on everything until the slice is meaningless. Reusing a dirty `@DataJpaTest` context with leftover rows. `@Transactional` tests that never see commit-time constraints. Flaky time.

`@WebMvcTest` without security and then wondering why prod 401s.

## When this is the wrong tool

A unit test of a pure function does not need Test slices. E2E is the wrong default for a mapper. If wiring is the product (many auto-configs), a narrower `@SpringBootTest` with a test slice of config may be honest. `@DataJpaTest` will not catch SQL that only fails on MySQL if you use H2 — use Testcontainers. Skip slices when they fight a custom `WebMvcConfigurer` you always need; document a composable `@Import`.

## A worked failure mode

`@SpringBootTest` is used for everything; CI is 40 minutes. `@WebMvcTest` mocks the service so thoroughly the controller’s mapping bugs are the only thing not tested. `@DataJpaTest` uses H2 while prod is Postgres-specific SQL. The failure is slice choice vs fidelity. Slices for speed with contract tests on Testcontainers for the SQL you depend on.

Slices are the wrong tool if you never test the wiring. Full tests are the wrong default for every PR. Mix them.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "Test Slices: @WebMvcTest, @DataJpaTest, and Knowing When to Skip Them" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
