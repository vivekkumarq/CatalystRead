import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** Fades the host element up into view the first time it is scrolled to.
    Elements already visible on load are left untouched, so nothing flashes. */
@Directive({ selector: '[appReveal]' })
export class Reveal {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const element = this.el.nativeElement;
      if (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        element.getBoundingClientRect().top < window.innerHeight * 0.92
      ) {
        return;
      }
      element.classList.add('reveal');
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            element.classList.add('is-revealed');
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px -8% 0px' },
      );
      observer.observe(element);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
