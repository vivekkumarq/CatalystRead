import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';
import { SITE } from '../../../core/constants/site';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { ReadingPrefs } from '../reading-prefs/reading-prefs';
import { BrandMark } from '../brand-mark/brand-mark';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, ThemeToggle, ReadingPrefs, BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-edge bg-paper/85 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a routerLink="/" class="group flex items-center gap-2 text-lg font-extrabold tracking-tight" (click)="menuOpen.set(false)">
          <app-brand-mark />
          <span class="text-ink">Catalyst<span class="text-accent">Read</span></span>
        </a>

        <nav class="ml-6 hidden items-center gap-1 sm:flex" aria-label="Primary">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="text-ink bg-raised"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            (click)="search.dialogOpen.set(true)"
            class="flex h-9 items-center gap-2 rounded-lg border border-edge px-3 text-sm text-ink-faint transition-colors hover:border-accent hover:text-accent"
            aria-label="Search articles"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span class="hidden md:inline">Search</span>
            <kbd class="hidden rounded border border-edge bg-raised px-1.5 py-0.5 font-sans text-[10px] font-semibold text-ink-faint md:inline">
              Ctrl K
            </kbd>
          </button>

          <app-reading-prefs />
          <app-theme-toggle />

          <button
            type="button"
            class="grid size-9 place-items-center rounded-lg border border-edge text-ink-soft transition-colors hover:border-accent hover:text-accent sm:hidden"
            (click)="menuOpen.set(!menuOpen())"
            [attr.aria-expanded]="menuOpen()"
            aria-label="Toggle navigation menu"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              @if (menuOpen()) {
                <path d="M6 6l12 12M18 6L6 18" />
              } @else {
                <path d="M4 7h16M4 12h16M4 17h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      @if (menuOpen()) {
        <nav class="border-t border-edge px-4 py-3 sm:hidden" aria-label="Primary mobile">
          <div class="flex flex-col gap-1">
            @for (link of links; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="text-accent"
                [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                (click)="menuOpen.set(false)"
                class="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
              >
                {{ link.label }}
              </a>
            }
          </div>
        </nav>
      }
    </header>
  `,
})
export class Header {
  protected readonly search = inject(SearchService);
  protected readonly site = SITE;
  protected readonly menuOpen = signal(false);
  protected readonly links = [
    { path: '/', label: 'Home' },
    { path: '/articles', label: 'Articles' },
    { path: '/topics', label: 'Topics' },
    { path: '/about', label: 'About' },
    { path: '/contribute', label: 'Contribute' },
  ];
}
