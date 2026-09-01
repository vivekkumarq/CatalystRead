---
title: "Building Accessible Components in Angular: Focus Management and ARIA"
slug: "angular-accessible-components-focus-aria"
description: "Practical patterns for managing focus and applying ARIA attributes correctly when building custom interactive components in Angular."
publishedAt: "2026-07-30"
category: "Angular"
tags:
  - Angular
  - Accessibility
  - ARIA
  - UI Components
---

Accessibility bugs in component libraries rarely come from missing `alt` text — they come from custom widgets that reinvent native behavior badly. A `div` styled as a button, a modal that doesn't trap focus, a dropdown that's mouse-only. Angular doesn't give you accessibility for free just because you used its templating syntax; you still have to model focus and semantics deliberately.

## Focus management on route change and modal open

By default, the Angular router does nothing about focus when navigating — the browser leaves it wherever it was, which is disorienting for screen reader and keyboard users navigating a single-page app. Move focus to the new view's heading on every navigation:

```typescript
export class AppComponent {
  private router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const heading = document.querySelector<HTMLElement>('h1[tabindex="-1"]');
        heading?.focus();
      });
  }
}
```

Give the target heading `tabindex="-1"` so it's programmatically focusable without being added to the normal tab order.

## Trapping focus in a modal

A modal that lets `Tab` escape into the page behind it is broken for keyboard users. The CDK's `cdkTrapFocus` directive handles the loop for you, and `cdkFocusInitial` marks which element should receive focus on open:

```html
<div cdkTrapFocus cdkTrapFocusAutoCapture role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title" cdkFocusInitial tabindex="-1">Delete item</h2>
  <button (click)="close()">Cancel</button>
  <button (click)="confirm()">Delete</button>
</div>
```

Just as important as trapping focus in is restoring it on close. `cdkTrapFocusAutoCapture` saves the element that had focus before the modal opened and returns focus there automatically — without it, closing a modal drops keyboard focus back to `<body>`, and the user has to tab through the entire page again to find where they were.

## ARIA attributes should be reactive, not static

Bind ARIA state to the same signals driving your component logic, not a fixed template attribute — a toggle whose `aria-expanded` never changes is worse than no attribute at all, because it actively lies to assistive tech:

```typescript
@Component({
  selector: 'app-accordion-header',
  template: `
    <button
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()">
      {{ title() }}
    </button>
  `,
})
export class AccordionHeaderComponent {
  expanded = signal(false);
  toggle() { this.expanded.update(v => !v); }
}
```

## Building keyboard interaction with cdk/a11y

For custom widgets like a tab list or toolbar, the CDK's `ListKeyManager` gives you arrow-key navigation, typeahead, and wraparound without hand-rolling `keydown` switch statements:

```typescript
this.keyManager = new FocusKeyManager(this.tabItems).withWrap().withTypeAhead();

@HostListener('keydown', ['$event'])
onKeydown(event: KeyboardEvent) {
  this.keyManager.onKeydown(event);
}
```

## Test with a keyboard, not just axe-core

Automated tools like `axe-core` catch missing attributes and contrast violations reliably, but they cannot tell you whether `Tab` order makes sense or whether focus visibly lands where you expect. Unplug the mouse periodically during development — it surfaces the class of bug that only shows up when you actually try to use what you built without a pointer, and it's the fastest way to build the habit of thinking in focus order rather than visual layout alone.
