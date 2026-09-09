import { DOCUMENT, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  ThemeOption,
} from '../constants/themes';

const STORAGE_KEY = 'catalystread-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly themes = THEMES;
  readonly lightThemes = THEMES.filter((theme) => theme.mode === 'light');
  readonly darkThemes = THEMES.filter((theme) => theme.mode === 'dark');

  /* The theme is applied by an inline script in index.html before first
     paint; the service reads back whatever it resolved. */
  readonly themeId = signal(this.readAppliedTheme());

  readonly current = computed<ThemeOption>(
    () => THEMES.find((theme) => theme.id === this.themeId()) ?? THEMES[0],
  );

  readonly isDark = computed(() => this.current().mode === 'dark');

  setTheme(id: string): void {
    const theme = THEMES.find((candidate) => candidate.id === id);
    if (!theme) {
      return;
    }
    this.themeId.set(theme.id);
    const root = this.document.documentElement;
    root.setAttribute('data-theme', theme.id);
    root.classList.toggle('dark', theme.mode === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme.id);
    } catch {
      /* storage unavailable (private mode); theme applies for this visit only */
    }
  }

  /** Jumps between the light and dark defaults for the quick toggle. */
  toggle(): void {
    this.setTheme(this.isDark() ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME);
  }

  private readAppliedTheme(): string {
    if (!this.isBrowser) {
      return DEFAULT_LIGHT_THEME;
    }
    const applied = this.document.documentElement.getAttribute('data-theme');
    return applied && THEMES.some((theme) => theme.id === applied)
      ? applied
      : DEFAULT_LIGHT_THEME;
  }
}
