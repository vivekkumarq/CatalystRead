import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type FontMode = 'default' | 'serif' | 'classic' | 'sans' | 'modern' | 'mono';
export type TextSize = 'sm' | 'md' | 'lg';

export const FONT_MODES: readonly FontMode[] = ['default', 'serif', 'classic', 'sans', 'modern', 'mono'];

const STORAGE_KEY = 'catalystread-prefs';

@Injectable({ providedIn: 'root' })
export class ReadingPrefsService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /* Initial classes are applied by an inline script in index.html before
     first paint; the service reads back the resolved state. */
  readonly fontMode = signal<FontMode>(this.readFontClass());
  readonly textSize = signal<TextSize>(this.readSizeClass());

  setFontMode(mode: FontMode): void {
    this.fontMode.set(mode);
    const classes = this.document.documentElement.classList;
    for (const candidate of FONT_MODES) {
      classes.remove(`pref-font-${candidate}`);
    }
    if (mode !== 'default') {
      classes.add(`pref-font-${mode}`);
    }
    this.persist();
  }

  setTextSize(size: TextSize): void {
    this.textSize.set(size);
    const classes = this.document.documentElement.classList;
    classes.toggle('pref-size-sm', size === 'sm');
    classes.toggle('pref-size-lg', size === 'lg');
    this.persist();
  }

  private readFontClass(): FontMode {
    if (!this.isBrowser) {
      return 'default';
    }
    const classes = this.document.documentElement.classList;
    for (const mode of FONT_MODES) {
      if (mode !== 'default' && classes.contains(`pref-font-${mode}`)) {
        return mode;
      }
    }
    return 'default';
  }

  private readSizeClass(): TextSize {
    if (!this.isBrowser) {
      return 'md';
    }
    const classes = this.document.documentElement.classList;
    if (classes.contains('pref-size-sm')) return 'sm';
    if (classes.contains('pref-size-lg')) return 'lg';
    return 'md';
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ font: this.fontMode(), size: this.textSize() }),
      );
    } catch {
      /* storage unavailable; preferences apply for this visit only */
    }
  }
}
