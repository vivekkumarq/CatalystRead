---
title: "Building Overlays and Menus with the Angular CDK"
slug: "angular-cdk-overlays-menus"
description: "How to build positioned, dismissible overlays such as menus and popovers using the Angular CDK's OverlayModule instead of ad-hoc absolute positioning."
publishedAt: "2026-05-25"
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
