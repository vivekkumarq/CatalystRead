---
title: "Portals, Event Delegation, and the Synthetic Event System in React"
slug: "react-portals-event-delegation-synthetic-events"
description: "How React portals render outside the DOM tree while events still bubble through React's component hierarchy, and what that means for event handling."
publishedAt: "2026-06-02"
category: "React"
tags:
  - React
  - Portals
  - Events
  - Frontend Engineering
---

Portals are one of the few places where React's DOM output and its component tree genuinely diverge, and that divergence trips people up specifically around events. A portal renders its children into a different DOM node — usually attached directly under `<body>` — but React events on those children still bubble through the *React* tree, not the DOM tree they physically live in. Understanding why requires understanding how React handles events in the first place.

## Why portals exist

CSS properties like `overflow: hidden` or a low `z-index` context on an ancestor make it genuinely impossible to visually escape a container from inside the normal DOM hierarchy — a tooltip inside a card with `overflow: hidden` gets clipped no matter what z-index you throw at it. Portals sidestep the problem by rendering into a different DOM location entirely, typically a dedicated node appended to `<body>`.

```jsx
import { createPortal } from 'react-dom';

function Tooltip({ children, targetRect }) {
  return createPortal(
    <div className="tooltip" style={{ top: targetRect.bottom, left: targetRect.left }}>
      {children}
    </div>,
    document.getElementById('tooltip-root'),
  );
}
```

`Tooltip` can be rendered anywhere in a component tree — deeply nested inside a clipped card — and its output still escapes to `#tooltip-root` in the actual DOM.

## Events still follow the React tree

React doesn't attach a listener to every individual DOM node. Since React 17, it attaches one delegated listener per event type to the root container the app was rendered into, and figures out which component's handler to call by walking its own virtual tree, not the raw DOM. That's why a click inside a portal still bubbles up to an `onClick` handler on a React ancestor, even though the portal's actual DOM node lives somewhere else entirely:

```jsx
function Modal() {
  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-content">Content</div>
    </div>,
    document.body,
  );
}

function App() {
  // this still fires for clicks inside the portal's content,
  // because React bubbling follows component nesting, not DOM nesting
  return (
    <div onClick={() => console.log('App click handler')}>
      <Modal />
    </div>
  );
}
```

This is usually exactly what you want — a portal-rendered dropdown menu still respects an outer `onClick`-based "close on outside click" handler defined in React terms. But it also means `event.stopPropagation()` inside the portal stops the event from reaching React ancestors, even though, if you inspected the raw DOM event with dev tools, it would appear to have bubbled to `<body>` first, since that's its actual physical parent.

## The synthetic event wrapper

React wraps native events in a `SyntheticEvent` object with a consistent, cross-browser API, pooled for performance in older versions (pooling was removed in React 17+, so it's safe to reference the event object asynchronously now). Access the underlying native event via `event.nativeEvent` when you need something React doesn't normalize, like exact pointer coordinates from a niche API.

## Practical implication: outside-click detection

Because delegated events follow React's tree, a naive `document.addEventListener('click', ...)` outside-click handler needs to check against the actual rendered DOM node — `ref.current.contains(event.target)` — rather than relying on React bubbling semantics, since that listener was registered directly on the DOM, bypassing React's delegation system entirely. Mixing native listeners with React's synthetic system works, but only if you're clear about which bubbling model you're reasoning with at any given point.
