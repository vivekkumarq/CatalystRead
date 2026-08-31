---
title: "Consistent Error Handling in Spring Boot REST APIs"
slug: "spring-boot-rest-api-error-handling"
description: "Design one error contract for your whole API using @RestControllerAdvice, ProblemDetail, and validation groups."
publishedAt: "2026-08-10"
category: "Spring Boot"
tags:
  - Spring Boot
  - REST APIs
  - Java
  - Backend Engineering
---

Nothing erodes trust in an API faster than inconsistent errors: a stack trace here, a bare 500 there, three different JSON shapes for the same class of failure. The good news is that Spring Boot gives you everything needed to define **one error contract** and enforce it everywhere.

## Start With the Contract

Since Spring Framework 6, the built-in `ProblemDetail` type implements [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (Problem Details for HTTP APIs). Adopting it means your errors follow a public standard instead of a house dialect:

```json
{
  "type": "https://api.example.com/problems/validation",
  "title": "Request validation failed",
  "status": 400,
  "detail": "2 fields are invalid",
  "instance": "/api/orders",
  "errors": [
    { "field": "email", "message": "must be a well-formed email address" },
    { "field": "quantity", "message": "must be greater than 0" }
  ]
}
```

## One Advice to Rule Them All

A single `@RestControllerAdvice` class is the choke point where every exception becomes a response. Nothing else in the codebase should build error responses.

```java
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail onValidationError(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Request validation failed");
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(err -> Map.of("field", err.getField(),
                                   "message", Objects.requireNonNullElse(err.getDefaultMessage(), "invalid")))
                .toList());
        return problem;
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ProblemDetail onNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Resource not found");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail onUnexpected(Exception ex) {
        // Log with full detail internally; expose nothing sensitive externally.
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setTitle("Unexpected error");
        return problem;
    }
}
```

Two details matter here. First, the catch-all handler logs everything but *returns* almost nothing — internals such as exception messages from deep in the stack are an information leak. Second, business exceptions like `ResourceNotFoundException` are part of your domain vocabulary; controllers throw them and never think about HTTP.

## Let Validation Do the Heavy Lifting

Bean Validation moves input rules out of imperative code and into declarations:

```java
public record CreateOrderRequest(
        @NotBlank String customerId,
        @Email String email,
        @Positive int quantity,
        @NotNull ProductCode productCode) {
}
```

With `@Valid` on the controller parameter, invalid requests never reach your service layer — they short-circuit into the advice above, producing the standard error shape automatically.

## Map Exceptions Deliberately

A useful discipline is a small, fixed taxonomy. Every failure in the system falls into one of a handful of buckets:

| Bucket | HTTP status | Thrown as |
| ------ | ----------- | --------- |
| Invalid input | 400 | Bean Validation |
| Not authenticated | 401 | Security filter chain |
| Not permitted | 403 | `AccessDeniedException` |
| Missing resource | 404 | `ResourceNotFoundException` |
| Business rule violated | 409 or 422 | `BusinessRuleException` |
| Anything else | 500 | Catch-all |

If a new exception doesn't fit a bucket, that's a design conversation — not an excuse for a new response shape.

## Takeaways

- Use `ProblemDetail` so your error format is a standard, not an invention.
- Centralize every exception-to-response mapping in one `@RestControllerAdvice`.
- Keep 500 responses opaque; keep 4xx responses actionable.
- Treat your exception taxonomy as part of the API contract and document it.

An API with boring, predictable errors is a joy to integrate against — and it takes about one afternoon to set up.
