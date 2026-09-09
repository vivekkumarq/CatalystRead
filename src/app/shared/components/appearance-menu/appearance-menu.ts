import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import {
  FontMode,
  ReadingPrefsService,
  TextSize,
} from '../../../core/services/reading-prefs.service';

/** One panel for every look-and-feel choice: theme, font, text size. */
@Component({
  selector: 'app-appearance-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="$event.stopPropagation(); open.set(!open())"
        class="grid size-9 place-items-center rounded-xl border border-edge bg-surface/60 text-ink-soft transition-colors hover:border-accent hover:text-accent"
        [class.border-accent]="open()"
        [class.text-accent]="open()"
        [attr.aria-expanded]="open()"
        aria-label="Appearance settings"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" />
          <path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h2a4 4 0 0 0 4-4 10 10 0 0 0-10-8Z" />
        </svg>
      </button>

      @if (open()) {
        <div
          class="animate-pop fixed inset-x-3 top-[4.5rem] z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-edge bg-surface p-5 shadow-2xl shadow-black/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80"
          role="menu"
          aria-label="Appearance settings"
          (click)="$event.stopPropagation()"
        >
          <section>
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Theme</p>

            <p class="mt-3 text-[11px] font-semibold text-ink-faint">Light</p>
            <div class="mt-1.5 grid grid-cols-4 gap-1.5">
              @for (option of theme.lightThemes; track option.id) {
                <button
                  type="button"
                  (click)="theme.setTheme(option.id)"
                  class="rounded-xl border p-1.5 transition-all duration-200 hover:-translate-y-0.5"
                  [class.border-accent]="theme.themeId() === option.id"
                  [class.border-edge]="theme.themeId() !== option.id"
                  [attr.aria-pressed]="theme.themeId() === option.id"
                  [attr.aria-label]="option.name + ' theme'"
                >
                  <span
                    class="flex h-7 items-end gap-0.5 overflow-hidden rounded-md border border-edge p-1"
                    [style.background]="option.swatch[0]"
                  >
                    <span class="h-3 flex-1 rounded-sm" [style.background]="option.swatch[1]"></span>
                    <span class="h-4 w-1.5 rounded-sm" [style.background]="option.swatch[2]"></span>
                  </span>
                  <span
                    class="mt-1 block truncate text-[10px] font-medium"
                    [class.text-accent]="theme.themeId() === option.id"
                    [class.text-ink-soft]="theme.themeId() !== option.id"
                  >
                    {{ option.name }}
                  </span>
                </button>
              }
            </div>

            <p class="mt-3 text-[11px] font-semibold text-ink-faint">Dark</p>
            <div class="mt-1.5 grid grid-cols-4 gap-1.5">
              @for (option of theme.darkThemes; track option.id) {
                <button
                  type="button"
                  (click)="theme.setTheme(option.id)"
                  class="rounded-xl border p-1.5 transition-all duration-200 hover:-translate-y-0.5"
                  [class.border-accent]="theme.themeId() === option.id"
                  [class.border-edge]="theme.themeId() !== option.id"
                  [attr.aria-pressed]="theme.themeId() === option.id"
                  [attr.aria-label]="option.name + ' theme'"
                >
                  <span
                    class="flex h-7 items-end gap-0.5 overflow-hidden rounded-md border border-edge p-1"
                    [style.background]="option.swatch[0]"
                  >
                    <span class="h-3 flex-1 rounded-sm" [style.background]="option.swatch[1]"></span>
                    <span class="h-4 w-1.5 rounded-sm" [style.background]="option.swatch[2]"></span>
                  </span>
                  <span
                    class="mt-1 block truncate text-[10px] font-medium"
                    [class.text-accent]="theme.themeId() === option.id"
                    [class.text-ink-soft]="theme.themeId() !== option.id"
                  >
                    {{ option.name }}
                  </span>
                </button>
              }
            </div>
          </section>

          <section class="mt-5 border-t border-edge pt-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Font style</p>
            <div class="mt-2 grid grid-cols-3 gap-1.5">
              @for (option of fontOptions; track option.value) {
                <button
                  type="button"
                  (click)="prefs.setFontMode(option.value)"
                  class="rounded-xl border px-2 py-2 text-center transition-colors"
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
          </section>

          <section class="mt-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Text size</p>
            <div class="mt-2 grid grid-cols-3 gap-1.5">
              @for (option of sizeOptions; track option.value) {
                <button
                  type="button"
                  (click)="prefs.setTextSize(option.value)"
                  class="rounded-xl border px-2 py-2 text-center transition-colors"
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
          </section>
        </div>
      }
    </div>
  `,
})
export class AppearanceMenu {
  protected readonly theme = inject(ThemeService);
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
