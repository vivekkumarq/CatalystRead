import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../../core/services/posts.service';
import { SITE } from '../../../core/constants/site';
import { BrandMark } from '../brand-mark/brand-mark';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, BrandMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t border-edge bg-surface">
      <div class="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pb-12">
        <div class="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div class="max-w-sm">
            <a routerLink="/" class="group flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <app-brand-mark />
              <span class="text-ink">Catalyst<span class="text-accent">Read</span></span>
            </a>
            <p class="mt-3 text-sm italic leading-relaxed text-ink-soft">{{ site.tagline }}</p>
            <p class="mt-2 text-sm leading-relaxed text-ink-faint">{{ site.description }}</p>
          </div>

          <div class="grid grid-cols-2 gap-8 sm:gap-16 lg:flex lg:gap-16">
          <nav aria-label="Topics" class="text-sm">
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Topics</h2>
            <ul class="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              @for (category of posts.techCategories.slice(0, 10); track category.slug) {
                <li>
                  <a [routerLink]="['/topics', category.slug]" class="text-ink-soft transition-colors hover:text-accent">
                    {{ category.name }}
                  </a>
                </li>
              }
            </ul>
            <a routerLink="/topics" class="mt-3 inline-block text-xs font-semibold text-accent hover:text-accent-strong">
              All topics →
            </a>
          </nav>

          <nav aria-label="Site" class="text-sm">
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">Site</h2>
            <ul class="space-y-2">
              <li><a routerLink="/about" class="text-ink-soft transition-colors hover:text-accent">About</a></li>
              <li><a routerLink="/contribute" class="text-ink-soft transition-colors hover:text-accent">Contribute</a></li>
              <li><a routerLink="/search" class="text-ink-soft transition-colors hover:text-accent">Search</a></li>
              <li><a href="feed.xml" class="text-ink-soft transition-colors hover:text-accent">RSS feed</a></li>
            </ul>
          </nav>
          </div>
        </div>

        <div class="mt-10 flex flex-col gap-2 border-t border-edge pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {{ year }} {{ site.name }} · {{ site.author }}</p>
          <p>Written and published from Markdown, one commit at a time.</p>
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly posts = inject(PostsService);
  protected readonly site = SITE;
  protected readonly year = new Date().getFullYear();
}
