---
title: "Web Components Interop: Making Custom Elements Play Nice With Frameworks"
slug: "web-components-interop"
description: "Web Components promise framework-agnostic UI, but the interop details — props vs attributes, events, and Shadow DOM styling — are where real integration breaks."
publishedAt: "2026-03-13"
category: "Web Development"
tags:
  - Web Development
  - Web Components
  - JavaScript
  - Frontend Engineering
---

The pitch for Web Components has always been portability: build a custom element once, use it in React, Vue, Angular, or plain HTML, no framework lock-in. The pitch is mostly true. What it undersells is that each framework talks to the DOM slightly differently, and Web Components sit exactly on the seam where those differences show up — attribute versus property binding, event handling, and Shadow DOM styling each need explicit handling to work smoothly outside a plain HTML page.

## Attributes vs Properties: The First Wall Everyone Hits

HTML attributes are always strings. A custom element that only reads `attributeChangedCallback` for a complex value — an array, an object — receives a serialized string it has to parse, which is exactly backwards from how most frameworks want to pass data.

```javascript
class ProductCard extends HTMLElement {
  static get observedAttributes() {
    return ['data-title'];
  }

  set product(value) {
    this._product = value; // property setter, accepts a real object
    this.render();
  }

  get product() {
    return this._product;
  }
}
customElements.define('product-card', ProductCard);
```

Well-behaved custom elements expose both: attributes for simple string/number values usable straight from HTML, and property setters/getters for complex data passed from JavaScript. Framework bindings matter here — React, before its native custom element support matured, bound everything as an HTML attribute rather than a DOM property, silently stringifying objects passed to a custom element unless you set the property manually via a ref. Confirm which path a given framework actually uses before assuming a complex prop will arrive correctly.

## React Now Sets Properties Correctly, But Verify

Modern React versions detect when a target is a custom element and set matching properties instead of attributes for non-string values, which resolved most of the historical friction:

```jsx
function ProductPage({ product }) {
  return <product-card product={product} onAddToCart={handleAdd} />;
}
```

Older React versions, and other tooling in a build chain that hasn't updated, may still need an explicit ref-based property assignment as a fallback:

```jsx
function ProductCardWrapper({ product }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.product = product;
  }, [product]);
  return <product-card ref={ref} />;
}
```

## Events Cross the Boundary With CustomEvent, Not Callback Props

Custom elements don't have props in the framework sense, and they signal outward with DOM events rather than callback functions — which means a framework's `onClick`-style prop naming convention doesn't automatically apply to a custom event a Web Component dispatches:

```javascript
class ProductCard extends HTMLElement {
  addToCart() {
    this.dispatchEvent(new CustomEvent('add-to-cart', {
      detail: { productId: this.product.id },
      bubbles: true,
      composed: true, // required to cross a Shadow DOM boundary
    }));
  }
}
```

`composed: true` is easy to forget and produces a specific, confusing failure: the event fires and does nothing outside the component, because by default custom events don't cross out of a Shadow DOM boundary at all. Listening from a framework typically means an explicit `addEventListener` (via a ref) rather than a JSX-style event prop, since most frameworks' synthetic event systems don't automatically pick up arbitrary custom event names.

## Shadow DOM Styling Needs Its Own Entry Point

Shadow DOM's style encapsulation is the feature that makes Web Components portable across apps with conflicting global CSS — and the same encapsulation blocks a host page's styles from reaching in, which surprises teams expecting their design tokens to just apply.

```css
:host {
  display: block;
  --card-radius: 8px;
}

:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}

::slotted(img) {
  border-radius: var(--card-radius);
}
```

CSS custom properties are the sanctioned bridge — they pierce Shadow DOM boundaries by design, so a host page setting `--card-radius` on the custom element (or an ancestor) reaches inside without breaking encapsulation. `::slotted()` is the other tool, letting the shadow tree apply limited styling to light-DOM content passed in via `<slot>`.

## The Realistic Integration Checklist

Before shipping a custom element for cross-framework use: expose both attributes and properties for every input, dispatch `CustomEvent`s with `composed: true` for every output, and expose styling hooks through custom properties and `::part()` rather than assuming host styles will reach in. Skipping any one of these doesn't break the component in isolation — it breaks silently, exactly when someone tries to consume it from a framework other than the one it was tested in.
