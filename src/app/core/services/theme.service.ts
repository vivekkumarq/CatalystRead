import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'catalystread-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /* The initial class is applied by an inline script in index.html before
     first paint, so the service just reads back the resolved state. */
  readonly isDark = signal(
    this.isBrowser && this.document.documentElement.classList.contains('dark'),
  );

  toggle(): void {
    const dark = !this.isDark();
    this.isDark.set(dark);
    this.document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      /* storage unavailable (private mode); theme applies for this visit only */
    }
  }
}
