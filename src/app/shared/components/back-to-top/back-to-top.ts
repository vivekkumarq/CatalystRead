import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button
        type="button"
        (click)="scrollToTop()"
        class="animate-page fixed bottom-6 right-6 z-40 grid size-11 place-items-center rounded-full border border-edge bg-surface text-ink-soft shadow-lg transition-colors hover:border-accent hover:text-accent"
        aria-label="Back to top"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
    }
  `,
})
export class BackToTop {
  protected readonly visible = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const update = () => this.visible.set(window.scrollY > 600);
      update();
      window.addEventListener('scroll', update, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', update));
    });
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
