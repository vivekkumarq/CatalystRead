---
title: "Controlled vs Uncontrolled Forms: Picking the Right Default"
slug: "react-controlled-vs-uncontrolled-forms"
description: "Controlled inputs became the reflexive default in React, but uncontrolled forms are often simpler, faster, and closer to how the platform already works."
publishedAt: "2026-03-05"
category: "React"
tags:
  - React
  - Forms
  - JavaScript
  - Frontend Engineering
---

Most React developers learn controlled inputs first — `value` and `onChange` wired to `useState` — and it becomes the unquestioned default for every form afterward. That default is worth revisiting. Controlled inputs buy you something specific: React state as the single source of truth, updated on every keystroke. A lot of forms don't actually need that, and paying for it anyway means more re-renders and more code than the form requires.

## What "Controlled" Actually Costs

```jsx
function ControlledForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit({ name, email, address }); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={address} onChange={(e) => setAddress(e.target.value)} />
    </form>
  );
}
```

Every keystroke in any field triggers a re-render of the whole form component. For three fields that's irrelevant. For a form with thirty fields, or one embedded in a component tree that isn't optimized for frequent re-renders, it's the difference between a form that feels instant and one that visibly lags on fast typing.

## The Uncontrolled Alternative

```jsx
function UncontrolledForm() {
  const formRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(formRef.current);
    submit(Object.fromEntries(data));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input name="name" defaultValue="" />
      <input name="email" defaultValue="" />
      <input name="address" defaultValue="" />
    </form>
  );
}
```

The DOM holds the current value of each field, exactly as it would in a plain HTML form with no JavaScript at all. React only reads the values once, at submit time, via `FormData`. No re-render fires per keystroke because React state never changes per keystroke — there isn't any.

## Where Controlled Genuinely Earns Its Cost

Controlled inputs are the right choice whenever the UI needs to *react* to the value as it's being typed, not just read it at submission:

- Live validation feedback ("this username is taken") that needs a value on every change.
- Formatting-as-you-type (credit card grouping, phone number masking).
- One field's value derived from another (a "total" field recalculating as quantity changes).
- Instant, synchronous enable/disable of a submit button based on the current field values.

```jsx
function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');
  const debounced = useDeferredValue(query);

  useEffect(() => { onSearch(debounced); }, [debounced, onSearch]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

Here the value genuinely needs to live in React state, because something downstream reacts to it continuously.

## Libraries Split the Difference

Most production forms use a library precisely because it lets fields stay uncontrolled by default while still exposing validation state reactively. React Hook Form is the clearest example — it registers refs on uncontrolled inputs and only triggers re-renders for the specific pieces of state (errors, dirty fields) that actually changed:

```jsx
function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: 'Email is required' })} />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

Typing in the email field doesn't re-render `LoginForm` at all — the library subscribes to field state outside React's render cycle and only surfaces a render when `errors.email` actually changes.

## The Decision in One Question

Ask whether anything needs to read a field's value before submit. If nothing does, default to uncontrolled — `defaultValue`, a ref, `FormData` on submit — and skip the state entirely. If something does (live validation, derived values, formatting), go controlled for that specific field, not the whole form by reflex. Mixing both within one form is normal and often the most efficient shape: uncontrolled for plain text fields, controlled only where reactivity is actually needed.
