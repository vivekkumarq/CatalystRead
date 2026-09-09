import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { TopicChip } from '../../shared/components/topic-chip/topic-chip';
import { Breadcrumbs, Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-topic-index',
  imports: [RouterLink, TopicChip, Breadcrumbs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <app-breadcrumbs [crumbs]="crumbs" />
          <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Topics</h1>
          <p class="mt-3 max-w-2xl text-[15px] text-ink-soft">
            Every article, organized by category, company, and tag.
          </p>
        </div>
      </section>

      <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <section aria-label="Categories">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            Categories
          </h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (category of posts.techCategories; track category.slug) {
              <a
                [routerLink]="['/topics', category.slug]"
                class="group flex items-center justify-between gap-3 rounded-2xl border border-edge bg-surface/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent-soft"
              >
                <span class="font-bold text-ink transition-colors group-hover:text-accent">
                  {{ category.name }}
                </span>
                <span class="shrink-0 rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-ink-faint">
                  {{ category.count }}
                </span>
              </a>
            }
          </div>
        </section>

        @if (posts.companyCategories.length > 0) {
          <section class="mt-12" aria-label="Engineering at scale">
            <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Engineering at scale — by company
            </h2>
            <p class="mt-2 max-w-2xl text-sm text-ink-soft">
              Real architecture stories from the teams that built at planet scale.
            </p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (company of posts.companyCategories; track company.slug) {
                <a
                  [routerLink]="['/topics', company.slug]"
                  class="group flex items-center justify-between gap-3 rounded-2xl border border-edge bg-surface/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent-soft"
                >
                  <span class="font-bold text-ink transition-colors group-hover:text-accent">
                    {{ company.name }}
                  </span>
                  <span class="shrink-0 rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-ink-faint">
                    {{ company.count }}
                  </span>
                </a>
              }
            </div>
          </section>
        }

        <section class="mt-12" aria-label="Tags">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">Tags</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            @for (tag of posts.tags; track tag.slug) {
              <app-topic-chip [name]="tag.name" [slug]="tag.slug" [count]="tag.count" />
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class TopicIndex {
  protected readonly posts = inject(PostsService);
  protected readonly crumbs: Crumb[] = [{ label: 'Topics' }];

  constructor() {
    inject(SeoService).page('Topics');
  }
}
