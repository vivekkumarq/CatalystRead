import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-reading-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden="true">
      <div class="h-full bg-accent" [style.width.%]="progress()"></div>
    </div>
  `,
})
export class ReadingProgress {
  protected readonly progress = signal(0);
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
