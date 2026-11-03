import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:py-32">
      <p class="text-7xl font-extrabold tracking-tight text-accent">404</p>
      <h1 class="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        This page never reacted
      </h1>
      <p class="mt-3 max-w-md text-ink-soft">
        The page you're looking for doesn't exist — it may have moved, or the link may be stale.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a
          routerLink="/"
          class="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Back home
        </a>
        <a
          routerLink="/articles"
          class="rounded-xl border border-edge px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Browse articles
        </a>
        <button
          type="button"
          (click)="surprise()"
          class="rounded-xl border border-edge px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Surprise me
        </button>
      </div>
    </div>
  `,
})
export class NotFound {
  private readonly router = inject(Router);
  private readonly posts = inject(PostsService);

  protected surprise(): void {
    void this.router.navigate(['/articles', this.posts.randomSlug()]);
  }

  constructor() {
    inject(SeoService).page('Page not found');
  }
}
