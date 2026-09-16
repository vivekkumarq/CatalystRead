---
title: "Building Accessible Components in Angular: Focus Management and ARIA"
slug: "angular-accessible-components-focus-aria"
description: "Practical patterns for managing focus and applying ARIA attributes correctly when building custom interactive components in Angular."
publishedAt: "2026-07-30"
updatedAt: "2026-09-16"
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

## A worked example

A modal opens from a button. On open you `focus()` the first focusable control inside the dialog. On close you return focus to the button. Tab cycles stay inside using CDK `FocusTrap` or a small keydown handler on Tab/Shift+Tab. The dialog has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the title id. A unit test with Testing Library's `userEvent.tab()` asserts the focus ring never lands on the page behind.

For a custom select, `aria-expanded`, `aria-activedescendant`, and arrow keys matter more than a click-only list.

## Failure modes

Focus moved to the dialog container that is not focusable (`tabindex` missing). Restoring focus to a button that unmounted with the route. `*ngIf` destroying the trap before the restore runs. ARIA that contradicts native semantics (`button` plus `role="link"`). Live regions that announce every keystroke. Color-only error states.

CDK overlay attaching to `body` without copying the active `aria-hidden` on the app root — screen readers still walk the page.

## When this is the wrong tool

Do not invent a focus trap for a native `<dialog>` that already has one. ARIA cannot fix a non-keyboardable canvas; provide a DOM alternative. If the control is a native checkbox, do not wrap it in a custom role. Accessibility overlays that "fix ARIA globally" are the wrong tool. For purely decorative motion, `aria-hidden` is enough — do not announce it.

## A worked failure mode

A custom dropdown sets `aria-expanded` but never moves focus into the list. Keyboard users open it, Tab lands on the page behind the overlay, and choosing an option leaves focus on a destroyed button. A screen reader announces the trigger twice because both the native button and a nested `<div role="button">` exist. Automated axe checks were green because they ran on the closed state. The failure is accessibility as attributes without a focus model. Trap or restore focus on open/close, one tab stop per control, test with a keyboard and a reader on the open state, and prefer CDK a11y primitives over reinvented roles.

ARIA on a `<div>` is the wrong tool when a native `<select>` or `<button>` already does the job. Do not add `aria-label` that contradicts visible text. Custom widgets are the wrong default for date picking if the native picker meets the need. Ship native semantics first; add ARIA when you truly custom-draw the control.
