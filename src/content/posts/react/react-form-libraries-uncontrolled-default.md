---
title: "React Form Libraries: Uncontrolled Defaults, Validation, and When to Skip the Framework"
slug: "react-form-libraries-uncontrolled-default"
description: "React Hook Form, native constraint validation, and why defaultValues plus uncontrolled inputs beat a controlled 80-field form."
publishedAt: "2026-08-30"
category: "React"
tags:
  - React
  - Forms
  - Validation
  - Performance
sources:
  - title: "React Hook Form"
    publisher: "react-hook-form.com"
    url: "https://www.react-hook-form.com/"
  - title: "HTML constraint validation"
    publisher: "MDN"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation"
---

Controlled inputs (`value` + `onChange` on every keystroke) re-render a large tree 60 times a second. That is why **React Hook Form** and similar libraries default to **uncontrolled** inputs: `register()` attaches a ref, the DOM holds the value, and you read it on submit or via `watch` only where you must. `defaultValues` seed the DOM. Schema validation (Zod, Yup) runs on submit or on blur, not necessarily on each character.

This is adjacent to "controlled vs uncontrolled" pedagogy and opposite a TanStack Query article: here the cache is the **form**, not the server.

## Uncontrolled is the performance default

```jsx
const { register, handleSubmit, formState: { errors } } = useForm({
  defaultValues: { email: '', qty: 1 },
});
<input {...register('email', { required: true })} />
```

`watch('email')` subscribes and re-renders; use it for a live preview, not for every field. `Controller` exists for design-system widgets that only speak controlled. If every field is a `Controller`, you bought a library and rebuilt controlled mode.

Native HTML `required`, `type=email`, `min` still work and help screen readers. Don't disable native validation then poorly reimplement it unless you need cross-field rules.

## Server and defaultValues

Async defaults: `reset(data)` after fetch, or `values` in v7+ depending on version. Stale `defaultValues` after navigation is a bug. Dirty fields matter for PATCH vs PUT. File inputs stay uncontrolled almost always.

Don't store the form in React Query unless you are hydrating drafts; fighting two sources of truth is how you lose keystrokes.

## When no library

Three fields, native `FormData`, a POST. The library pays off at field arrays, wizard steps, and i18n error maps. Formik's classic model is more controlled; know that if you inherit it.

Read RHF's performance docs and the constraint validation API. Then remove `watch()` from 12 fields that did not need live UI. The uncontrolled default is the whole thesis: the DOM is a fine store until you need React to see every character.
