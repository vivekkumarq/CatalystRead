import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import {
  FontMode,
  ReadingPrefsService,
  TextSize,
} from '../../../core/services/reading-prefs.service';

@Component({
  selector: 'app-reading-prefs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="$event.stopPropagation(); open.set(!open())"
        class="grid size-9 place-items-center rounded-lg border border-edge text-ink-soft transition-colors hover:border-accent hover:text-accent"
        [attr.aria-expanded]="open()"
        aria-label="Reading preferences"
      >
        <span class="text-[13px] font-semibold tracking-tight" aria-hidden="true">aA</span>
      </button>

      @if (open()) {
        <div
          class="animate-pop absolute right-0 top-11 z-50 w-64 rounded-2xl border border-edge bg-surface p-4 shadow-xl"
          role="menu"
          aria-label="Reading preferences"
          (click)="$event.stopPropagation()"
        >
          <p class="text-xs font-bold uppercase tracking-wider text-ink-faint">Font style</p>
          <div class="mt-2 grid grid-cols-3 gap-1.5">
            @for (option of fontOptions; track option.value) {
              <button
                type="button"
                (click)="prefs.setFontMode(option.value)"
                class="rounded-lg border px-2 py-2 text-center transition-colors"
                [class.border-accent]="prefs.fontMode() === option.value"
                [class.bg-accent-soft]="prefs.fontMode() === option.value"
                [class.text-accent]="prefs.fontMode() === option.value"
                [class.border-edge]="prefs.fontMode() !== option.value"
                [class.text-ink-soft]="prefs.fontMode() !== option.value"
              >
                <span class="block text-base leading-none" [style.font-family]="option.stack">Ag</span>
                <span class="mt-1 block text-[10px] font-medium">{{ option.label }}</span>
              </button>
            }
          </div>

          <p class="mt-4 text-xs font-bold uppercase tracking-wider text-ink-faint">Text size</p>
          <div class="mt-2 grid grid-cols-3 gap-1.5">
            @for (option of sizeOptions; track option.value) {
              <button
                type="button"
                (click)="prefs.setTextSize(option.value)"
                class="rounded-lg border px-2 py-2 text-center transition-colors"
                [class.border-accent]="prefs.textSize() === option.value"
                [class.bg-accent-soft]="prefs.textSize() === option.value"
                [class.text-accent]="prefs.textSize() === option.value"
                [class.border-edge]="prefs.textSize() !== option.value"
                [class.text-ink-soft]="prefs.textSize() !== option.value"
              >
                <span class="block leading-none" [style.font-size]="option.preview">A</span>
                <span class="mt-1 block text-[10px] font-medium">{{ option.label }}</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ReadingPrefs {
  protected readonly prefs = inject(ReadingPrefsService);
  protected readonly open = signal(false);

  protected readonly fontOptions: { value: FontMode; label: string; stack: string }[] = [
    { value: 'default', label: 'Editorial', stack: 'inherit' },
    { value: 'serif', label: 'Serif', stack: "Charter, 'Sitka Text', Cambria, Georgia, serif" },
    {
      value: 'classic',
      label: 'Classic',
      stack: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
    },
    { value: 'sans', label: 'Sans', stack: 'ui-sans-serif, system-ui, sans-serif' },
    { value: 'modern', label: 'Modern', stack: "'Trebuchet MS', Verdana, Tahoma, sans-serif" },
    { value: 'mono', label: 'Mono', stack: "ui-monospace, 'Cascadia Code', Consolas, monospace" },
  ];

  protected readonly sizeOptions: { value: TextSize; label: string; preview: string }[] = [
    { value: 'sm', label: 'Compact', preview: '0.8rem' },
    { value: 'md', label: 'Default', preview: '1rem' },
    { value: 'lg', label: 'Large', preview: '1.2rem' },
  ];

  @HostListener('document:click')
  onOutsideClick(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }
}
