---
title: "Building Overlays and Menus with the Angular CDK"
slug: "angular-cdk-overlays-menus"
description: "How to build positioned, dismissible overlays such as menus and popovers using the Angular CDK's OverlayModule instead of ad-hoc absolute positioning."
publishedAt: "2026-05-25"
updatedAt: "2026-09-16"
category: "Angular"
tags:
  - Angular
  - Angular CDK
  - UI Components
  - Frontend Engineering
---

Every team eventually builds a dropdown menu with `position: absolute` and a `document:click` listener to close it, and every team eventually regrets it once that menu needs to flip when it hits the viewport edge, close on `Escape`, or trap focus for keyboard users. The Angular CDK's Overlay package solves this class of problem once, generically, and it's worth reaching for before writing a fifth bespoke popover implementation.

## Creating an overlay with a connected position

The core building blocks are `Overlay`, `OverlayRef`, and a `PositionStrategy`. `flexibleConnectedTo` anchors the overlay to a trigger element and automatically repositions it if the preferred placement would overflow the viewport.

```typescript
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

export class MenuTriggerDirective {
  private overlay = inject(Overlay);
  private overlayRef: OverlayRef | null = null;

  open(trigger: ElementRef, menuTemplate: TemplatePortal) {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    this.overlayRef.attach(menuTemplate);
    this.overlayRef.backdropClick().subscribe(() => this.close());
  }

  close() {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
```

The `withPositions` array is a fallback list, not a single choice — the CDK tries the first pair and falls through to the next if it would clip against the viewport. That's the flip behavior you'd otherwise have to compute by hand with `getBoundingClientRect`.

## Don't reinvent menu semantics — use CdkMenu

For anything that behaves like an actual menu — arrow-key navigation, `Home`/`End`, type-ahead — skip building interaction logic on top of raw overlays and use `@angular/cdk/menu` directly:

```html
<button [cdkMenuTriggerFor]="fileMenu">File</button>

<ng-template #fileMenu>
  <div cdkMenu class="menu-panel">
    <button cdkMenuItem (cdkMenuItemTriggered)="newFile()">New File</button>
    <button cdkMenuItem [cdkMenuTriggerFor]="exportSubmenu">Export</button>
  </div>
</ng-template>
```

`CdkMenu` handles roving tabindex, `role="menu"`/`role="menuitem"` wiring, and nested submenu opening on hover or arrow-right, all of which are tedious and easy to get slightly wrong by hand.

## Scroll strategies matter more than people expect

The default `noop` scroll strategy leaves the overlay floating in place while the page scrolls underneath it, which looks broken for anything anchored to a trigger. `reposition()` recalculates position on scroll; `close()` dismisses the overlay entirely once the trigger scrolls out of view — the right choice for a context menu, since a menu detached from its anchor is just confusing. `block()` is for modals, where you want to prevent background scroll altogether.

## Cleanup discipline

`OverlayRef` instances aren't garbage collected just because the component holding a reference is destroyed — dispose of them explicitly in `ngOnDestroy`, or you'll accumulate detached overlay panes in the DOM every time a component with an open overlay gets torn down mid-session, which is a surprisingly common source of "ghost" click targets in long-running SPAs.

## A worked example

A row action menu uses `CdkMenu` / overlay connected to the trigger with `FlexibleConnectedPositionStrategy`: below-start, then above-start if there is no space. Scroll strategy is `reposition`. Clicking outside dismisses. Keyboard: ArrowDown opens and focuses the first item; Escape closes. You provide a `ScrollDispatcher` so a scrolling parent not on `window` still repositions.

A test opens the overlay, clicks the second item, and asserts the overlay is detached and the trigger is focused.

## Failure modes

Multiple overlays without a stack: a dialog opens a menu that paints behind. Not disposing the overlay ref on destroy leaks the pane. Position strategy that only considers viewport, not a clipped `overflow: hidden` parent. Using `block` scroll strategy on a small dropdown and freezing the whole app. Missing CDK a11y module so menus are mouse-only.

`OnPush` parent not marking for check when overlay data changes — the menu shows yesterday's items.

## When this is the wrong tool

Native `<select>` and `<dialog>` beat CDK for simple cases. Do not use overlays to implement tooltips that should be CSS `title` or a small popover. If you need pixel-identical design-system popovers across React and Angular, a headless spec plus each platform's primitive may be better than forcing CDK in a non-Angular island. CDK is the wrong tool for canvas context menus inside WebGL — use a DOM overlay positioned from pointer coords, still, but not a menu attached to a missing trigger element.

## A worked failure mode

A menu overlay is configured with `flexibleConnectedTo` but no `scrollStrategy`. On a long page the menu detaches visually while clicks still hit an invisible pane, blocking the form underneath. Escape closes the overlay in the CDK but the component leaves `isOpen=true`, so the next click does nothing. Mobile Safari zooms because the overlay used a focusable input without `font-size: 16px`. The failure is overlay as CSS `position: absolute` folklore. Use CDK positioning, scroll and block strategies, keep open state in sync with overlay attach/detach, and test scroll, zoom, and nested overlays.

A CDK overlay is the wrong tool for a simple inline disclosure; `<details>` or a class toggle is enough. Do not overlay every tooltip if a native `title` or a small popover component exists. Overlays are the wrong place to host a full routed app. Use them for floating UI that must survive clipping and scroll, not as a second layout system.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "Building Overlays and Menus with the Angular CDK" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
