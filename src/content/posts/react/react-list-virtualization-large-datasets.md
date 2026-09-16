---
title: "List Virtualization for Large Data Sets in React"
slug: "react-list-virtualization-large-datasets"
description: "How windowing libraries keep React lists fast at thousands of rows by rendering only what's visible, and where the technique breaks down."
publishedAt: "2026-05-19"
updatedAt: "2026-09-16"
category: "React"
tags:
  - React
  - Performance
  - Virtualization
  - UI Components
---

Rendering a few hundred DOM nodes is cheap. Rendering ten thousand rows for a table that shows twenty at a time is not — the browser still has to lay out, paint, and hold onto every one of those nodes even though only a handful are ever visible in the viewport. List virtualization, also called windowing, fixes this by rendering only the rows currently in or near the viewport and swapping their content as the user scrolls, keeping the DOM node count roughly constant no matter how large the underlying data set is.

## The mechanics with a fixed-size list

`react-window` is the common choice for fixed-height rows because its API surface is small and the overhead is minimal. It renders a scrollable container, tracks scroll offset, and only mounts rows that fall within the visible range plus a small overscan buffer.

```jsx
import { FixedSizeList } from 'react-window';

function ContactList({ contacts }) {
  const Row = ({ index, style }) => (
    <div style={style} className="contact-row">
      {contacts[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={contacts.length}
      itemSize={48}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

The `style` prop passed into `Row` is not optional decoration — it carries the absolute positioning that places each rendered row at its correct scroll offset. Dropping it breaks the illusion entirely; rows will stack at the top instead of appearing where the scrollbar says they should be.

## Variable row heights are the hard case

Fixed-size virtualization is straightforward because row position is a simple multiplication: `index * itemSize`. Variable heights — a chat log with wrapping messages, a feed with optional images — require either a measurement pass or an estimate that gets corrected as rows actually render:

```jsx
import { VariableSizeList } from 'react-window';

const getItemSize = (index) => messages[index].hasImage ? 220 : 64;

<VariableSizeList
  height={600}
  itemCount={messages.length}
  itemSize={getItemSize}
  width="100%"
>
  {Row}
</VariableSizeList>
```

If your row heights genuinely can't be predicted ahead of render — rich text with unpredictable wrapping, for instance — `@tanstack/react-virtual` handles dynamic measurement more gracefully, remeasuring each row after it mounts and correcting scroll position to compensate.

## Where virtualization actively hurts

Virtualized lists break a few things browsers give you for free. Native `Ctrl+F` find-in-page can't find text in rows that aren't currently mounted, since it's not in the DOM at all. Screen readers relying on document order for navigation get confused by rows appearing and disappearing outside the user's control. And `position: sticky` headers inside a virtualized container often need special handling because the library, not native scroll, controls what's rendered where.

For a list under a few hundred items, none of this trade-off is worth making — the render cost of a few hundred plain `<div>`s is not the bottleneck, and you'd be adding real complexity and losing find-in-page for a performance problem you don't have. Measure actual frame time with the React Profiler before reaching for virtualization; it's a fix for a specific, verified problem, not a default list-rendering strategy.

## Combining with infinite scroll

Virtualization and paginated fetching compose well — render a virtualized window over data you're incrementally loading, triggering the next page fetch when the rendered range approaches the end of what's currently loaded, rather than fetching the entire data set up front just to virtualize it.

## A worked example

10k rows, 36px height, `@tanstack/react-virtual` or `react-window`. The parent has a fixed height. `getItemKey` is the row id. Variable heights use a measure ref. Keyboard: you keep a real focused row in the DOM or a roving tabindex plan. A test with 100 rows asserts only a window of nodes exist.

Overscan of 5 rows reduces blank flash on fast scroll.

## Failure modes

Virtualizing 20 rows. Variable height without measure, jumpy scroll. Auto-height parent so the window is infinite. Keys as indexes. Accessibility: virtualized tables that cannot be read by screen readers. Sticky headers that desync. Combining windowing with CSS animations on all rows.

Measuring during render in a loop that forces sync layout.

## When this is the wrong tool

Pagination or a smaller query is better than virtualizing a million rows in the browser. Virtualization is the wrong tool for print layout and for SEO lists that must be in HTML (SSR the first page). If rows have wildly different interactive widgets, a windowing library may fight you. Prefer server-side filtering first. Do not virtualize a flex wrap of cards without a proven library for 2D grids.
