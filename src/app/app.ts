import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { SearchDialog } from './shared/components/search-dialog/search-dialog';
import { BackToTop } from './shared/components/back-to-top/back-to-top';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Header, Footer, SearchDialog, BackToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="[]"
      fragment="main-content"
      class="sr-only z-50 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Skip to content
    </a>
    <div class="cr-ambient" aria-hidden="true"></div>
    <app-header />
    <main id="main-content" class="min-h-[70vh]">
      <router-outlet />
    </main>
    <app-footer />
    <app-search-dialog />
    <app-back-to-top />
  `,
})
export class App {}
