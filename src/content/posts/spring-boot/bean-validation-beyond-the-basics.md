---
title: "Bean Validation Beyond @NotNull: Groups, Custom Constraints, and Cross-Field Rules"
slug: "bean-validation-beyond-the-basics"
description: "Moving past @NotBlank and @Email to validation groups, custom constraint annotations, and cross-field rules that Bean Validation can express cleanly."
publishedAt: "2025-07-02"
category: "Spring Boot"
tags:
  - Spring Boot
  - Java
  - Validation
  - Backend Engineering
---

Most Spring Boot codebases use maybe five Bean Validation annotations — `@NotNull`, `@NotBlank`, `@Size`, `@Email`, `@Positive` — and then drop into imperative `if` statements the moment a rule gets slightly more interesting. That's a missed opportunity: Bean Validation handles cross-field rules, conditional requirements, and reusable custom constraints, and keeping them declarative pays off the same way keeping them out of controllers does — the validation logic stays in one place, testable in isolation from HTTP concerns.

## Validation Groups for Conditional Requirements

The same DTO often needs different rules depending on context — a field required on creation but immutable (and therefore absent) on update. Validation groups express that without duplicating the class.

```java
public interface OnCreate {}
public interface OnUpdate {}

public record UserRequest(
        @Null(groups = OnCreate.class) @NotNull(groups = OnUpdate.class) Long id,
        @NotBlank @Email String email,
        @NotBlank(groups = OnCreate.class) String password) {
}
```

```java
@PostMapping
ResponseEntity<UserDto> create(@Validated(OnCreate.class) @RequestBody UserRequest request) { ... }

@PutMapping("/{id}")
ResponseEntity<UserDto> update(@Validated(OnUpdate.class) @RequestBody UserRequest request) { ... }
```

Groups are most valuable when a handful of fields genuinely differ by operation. If nearly every field's requirement changes between create and update, that's usually a sign you want two separate DTOs rather than one record straining to cover both cases through groups.

## Custom Constraints for Domain Rules You Check Repeatedly

Any validation rule your team writes as an `if` statement in more than one place is a candidate for a custom constraint. A product SKU format, a currency code against an allowed set, a phone number shape — these belong in an annotation, not scattered across services.

```java
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SkuFormatValidator.class)
public @interface ValidSku {
    String message() default "must match format XX-000000";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class SkuFormatValidator implements ConstraintValidator<ValidSku, String> {
    private static final Pattern SKU_PATTERN = Pattern.compile("^[A-Z]{2}-\\d{6}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || SKU_PATTERN.matcher(value).matches();
    }
}
```

Returning `true` for `null` is deliberate — null-handling belongs to `@NotNull`, and combining the two concerns in one validator makes the annotation harder to reuse on optional fields later.

## Cross-Field Rules with Class-Level Constraints

Some rules inherently involve more than one field — a date range where the end must follow the start, a discount that can't exceed the order total. Bean Validation supports this through class-level constraints.

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DateRangeValidator.class)
public @interface ValidDateRange {
    String message() default "endDate must not be before startDate";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@ValidDateRange
public record BookingRequest(LocalDate startDate, LocalDate endDate, String roomId) {}

public class DateRangeValidator implements ConstraintValidator<ValidDateRange, BookingRequest> {
    @Override
    public boolean isValid(BookingRequest request, ConstraintValidatorContext context) {
        if (request.startDate() == null || request.endDate() == null) {
            return true; // let @NotNull handle absence
        }
        return !request.endDate().isBefore(request.startDate());
    }
}
```

For anything more elaborate than two or three fields interacting, a class-level constraint starts to feel like it's fighting the framework — at that point, plain validation code in the service layer, called explicitly and unit-tested directly, is more readable than a constraint annotation trying to do too much. Bean Validation is at its best expressing rules a reviewer can understand from the annotation alone; once a validator needs comments to explain itself, it's earned a home outside the annotation system.
