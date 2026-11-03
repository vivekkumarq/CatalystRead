import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-reading-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden="true">
      <div class="cr-progress-bar h-full" [style.width.%]="progress()"></div>
    </div>
    @if (minutesLeft() !== null) {
      <div
        class="animate-fade pointer-events-none fixed bottom-5 left-5 z-30 hidden items-center gap-2 rounded-full border border-edge bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-lg backdrop-blur-xl sm:flex print:hidden"
        aria-hidden="true"
      >
        <svg class="size-3.5 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--cr-edge)" stroke-width="5" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--cr-accent)" stroke-width="5" stroke-dasharray="94.25" [attr.stroke-dashoffset]="94.25 * (1 - progress() / 100)" />
        </svg>
        {{ minutesLeft() }} min left
      </div>
    }
  `,
})
export class ReadingProgress {
  /** The article's reading time; 0 hides the "min left" pill. */
  readonly minutes = input(0);

  protected readonly progress = signal(0);
  protected readonly minutesLeft = computed(() => {
    const progress = this.progress();
    if (!this.minutes() || progress < 3 || progress > 97) return null;
    return Math.max(1, Math.ceil(this.minutes() * (1 - progress / 100)));
  });
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        this.progress.set(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
      };
      update();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      });
    });
  }
}
