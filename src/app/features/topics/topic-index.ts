import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { TopicChip } from '../../shared/components/topic-chip/topic-chip';

@Component({
  selector: 'app-topic-index',
  imports: [RouterLink, TopicChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header class="max-w-2xl">
        <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Topics</h1>
        <p class="mt-3 text-ink-soft">Every article, organized by category and tag.</p>
      </header>

      <section class="mt-10" aria-label="Categories">
        <h2 class="text-xs font-bold uppercase tracking-wider text-ink-faint">Categories</h2>
        <div class="stagger mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (category of posts.techCategories; track category.slug) {
            <a
              [routerLink]="['/topics', category.slug]"
              class="group flex items-center justify-between rounded-2xl border border-edge bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent-soft"
            >
              <span class="font-bold text-ink transition-colors group-hover:text-accent">
                {{ category.name }}
              </span>
              <span class="rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-ink-faint">
                {{ category.count }} {{ category.count === 1 ? 'article' : 'articles' }}
              </span>
            </a>
          }
        </div>
      </section>

      @if (posts.companyCategories.length > 0) {
        <section class="mt-12" aria-label="Engineering at scale">
          <h2 class="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Engineering at scale — by company
          </h2>
          <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (company of posts.companyCategories; track company.slug) {
              <a
                [routerLink]="['/topics', company.slug]"
                class="group flex items-center justify-between rounded-2xl border border-edge bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent-soft"
              >
                <span class="font-bold text-ink transition-colors group-hover:text-accent">
                  {{ company.name }}
                </span>
                <span class="rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-ink-faint">
                  {{ company.count }} {{ company.count === 1 ? 'article' : 'articles' }}
                </span>
              </a>
            }
          </div>
        </section>
      }

      <section class="mt-12" aria-label="Tags">
        <h2 class="text-xs font-bold uppercase tracking-wider text-ink-faint">Tags</h2>
        <div class="mt-4 flex flex-wrap gap-2.5">
          @for (tag of posts.tags; track tag.slug) {
            <app-topic-chip [name]="tag.name" [slug]="tag.slug" [count]="tag.count" />
          }
        </div>
      </section>
    </div>
  `,
})
export class TopicIndex {
  protected readonly posts = inject(PostsService);

  constructor() {
    inject(SeoService).page('Topics');
  }
}
