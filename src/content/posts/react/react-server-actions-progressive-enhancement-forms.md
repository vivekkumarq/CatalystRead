---
title: "Form Handling with Server Actions and Progressive Enhancement"
slug: "react-server-actions-progressive-enhancement-forms"
description: "How React server actions let forms work before JavaScript loads, and the patterns needed to layer client-side validation and pending state on top."
publishedAt: "2026-06-30"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Server Actions
  - Forms
  - Progressive Enhancement
---

A form built with an `onSubmit` handler and `preventDefault()` is entirely dependent on JavaScript having loaded and executed before the user tries to submit it. On a slow connection, or if a script fails to load, that form is just dead HTML. Server actions flip the default: a `<form action={serverFunction}>` works as a real HTML form submission first, with client-side enhancement layered on top rather than required as a prerequisite.

## The baseline: a form that works without JS

A server action is a function marked `'use server'` that a form's `action` prop can reference directly. The browser can submit this as a genuine navigation-triggering POST if JavaScript hasn't hydrated yet.

```jsx
// actions.js
'use server';

export async function createComment(formData) {
  const text = formData.get('comment');
  if (!text || text.trim().length === 0) {
    return { error: 'Comment cannot be empty' };
  }
  await db.comments.insert({ text });
  revalidatePath('/posts/current');
}
```

```jsx
import { createComment } from './actions';

function CommentForm() {
  return (
    <form action={createComment}>
      <textarea name="comment" required />
      <button type="submit">Post</button>
    </form>
  );
}
```

Without any client JavaScript at all, this is a working form — the browser submits it, the server processes it, and the page reflects the result on the response. That's the progressive enhancement floor, and it's worth confirming by literally disabling JavaScript in dev tools and testing the flow.

## Layering pending state with useFormStatus

Once JavaScript is available, `useFormStatus` gives a submit button access to the enclosing form's pending state without prop drilling it down manually — but it must be called from a component nested inside the `<form>`, not the component that renders the form itself:

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Posting...' : 'Post'}
    </button>
  );
}

function CommentForm() {
  return (
    <form action={createComment}>
      <textarea name="comment" required />
      <SubmitButton />
    </form>
  );
}
```

## Surfacing server-side validation errors

`useActionState` wraps the action and threads its return value back as render-time state, which is how the `{ error: '...' }` response from `createComment` gets displayed:

```jsx
import { useActionState } from 'react';

function CommentForm() {
  const [state, formAction] = useActionState(createComment, null);

  return (
    <form action={formAction}>
      <textarea name="comment" required />
      {state?.error && <p role="alert">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

## Client-side validation as an enhancement, not a requirement

Add `required`, `pattern`, and `minLength` as native HTML attributes so validation works even without JavaScript, and treat any JS-driven validation as a faster feedback loop layered on top — never the only line of defense, since server actions must re-validate anyway. A malicious or buggy client can always submit a raw POST bypassing whatever a JS validator would have blocked, so the server-side check inside the action itself isn't optional polish; it's the actual security boundary, with everything else purely for UX.

## A worked example

A `<form action={updateEmail}>` works without JS: POST, server validates, redirects with a cookie flash. With JS, the same action runs without a full reload; `useFormStatus` pending. Hidden `_intent` fields distinguish "save" vs "delete". Idempotency key in a hidden field for retries.

You test with JS disabled in Playwright and with JS on.

## Failure modes

Actions that only work with client `fetch` and empty native action. CSRF if you mix cookies and a wide CORS. Returning huge payloads from actions. Not revalidating tags so the page shows old data. Double submit. File uploads without size limits.

Using GET forms for mutations because it "worked in demo."

## When this is the wrong tool

A rich SPA canvas editor is not a form action. Search-as-you-type should not be a server action per key. If the backend is a public JSON API for mobile too, keep a shared handler, not only a Next-style action. Progressive enhancement is the wrong hill if the product is a WebGL game. Do not replace a well-tested REST mutation layer overnight for a single form.
