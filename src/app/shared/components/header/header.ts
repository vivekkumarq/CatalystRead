import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';
import { SITE } from '../../../core/constants/site';
import { AppearanceMenu } from '../appearance-menu/appearance-menu';
import { BrandMark } from '../brand-mark/brand-mark';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, AppearanceMenu, BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-edge/70 bg-paper/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a
          routerLink="/"
          class="group flex shrink-0 items-center gap-2 text-[17px] font-extrabold tracking-tight"
          (click)="menuOpen.set(false)"
        >
          <app-brand-mark />
          <span class="text-ink">Catalyst<span class="text-accent">Read</span></span>
        </a>

        <nav class="ml-4 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="!text-accent !bg-accent-soft"
              [routerLinkActiveOptions]="{ exact: link.path === '/' }"
              class="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            (click)="search.dialogOpen.set(true)"
            class="hidden h-9 items-center gap-2 rounded-xl border border-edge bg-surface/60 pl-3 pr-2 text-sm text-ink-faint transition-colors hover:border-accent hover:text-accent sm:flex"
            aria-label="Search articles"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span class="hidden md:inline">Search articles</span>
            <kbd class="hidden rounded-md border border-edge bg-raised px-1.5 py-0.5 font-sans text-[10px] font-semibold text-ink-faint md:inline">
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            (click)="search.dialogOpen.set(true)"
            class="grid size-9 place-items-center rounded-xl border border-edge bg-surface/60 text-ink-soft transition-colors hover:border-accent hover:text-accent sm:hidden"
            aria-label="Search articles"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          <app-appearance-menu />

          <button
            type="button"
            class="grid size-9 place-items-center rounded-xl border border-edge bg-surface/60 text-ink-soft transition-colors hover:border-accent hover:text-accent lg:hidden"
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
        <nav
          class="animate-slide-down border-t border-edge bg-paper/95 px-4 py-3 backdrop-blur-xl lg:hidden"
          aria-label="Primary mobile"
        >
          <div class="flex flex-col gap-0.5">
            @for (link of links; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="!text-accent !bg-accent-soft"
                [routerLinkActiveOptions]="{ exact: link.path === '/' }"
                (click)="menuOpen.set(false)"
                class="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
              >
                {{ link.label }}
                <svg class="size-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
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
