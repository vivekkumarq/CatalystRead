import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { BRAND_COLORS } from '../../core/constants/brands';
import { TopicInfo } from '../../core/models/post.model';
import { TopicChip } from '../../shared/components/topic-chip/topic-chip';
import { TopicMark } from '../../shared/components/topic-mark/topic-mark';
import { Breadcrumbs, Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-topic-index',
  imports: [RouterLink, TopicChip, TopicMark, Breadcrumbs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band">
        <div class="cr-aurora" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <app-breadcrumbs [crumbs]="crumbs" />
          <h1 class="mt-4 cr-heading font-extrabold text-ink">Topics</h1>
          <p class="mt-3 max-w-2xl text-[15px] text-ink-soft">
            {{ posts.techCategories.length }} categories, {{ posts.companyCategories.length }} companies and
            {{ posts.tags.length }} tags — every article, organized.
          </p>
          <label class="mt-6 flex max-w-md items-center gap-3 rounded-2xl border border-edge bg-surface/85 px-4 shadow-sm backdrop-blur-md transition-colors focus-within:border-accent/60">
            <svg class="size-4 shrink-0 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span class="sr-only">Filter topics</span>
            <input
              type="search"
              placeholder="Filter topics, companies and tags…"
              autocomplete="off"
              class="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
              [value]="filter()"
              (input)="filter.set($any($event.target).value)"
            />
          </label>
        </div>
      </section>

      <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        @if (categories().length > 0) {
          <section aria-labelledby="categories-heading">
            <h2 id="categories-heading" class="cr-eyebrow">Categories</h2>
            <div class="stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (category of categories(); track category.slug) {
                <a
                  [routerLink]="['/topics', category.slug]"
                  class="cr-lift group flex items-center gap-4 rounded-2xl border border-edge bg-surface/70 p-4 backdrop-blur-sm"
                >
                  <app-topic-mark [slug]="category.slug" [name]="category.name" />
                  <span class="min-w-0 flex-1 font-bold text-ink transition-colors group-hover:text-accent">
                    {{ category.name }}
                  </span>
                  <span class="shrink-0 rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-faint">
                    {{ category.count }}
                  </span>
                </a>
              }
            </div>
          </section>
        }

        @if (companies().length > 0) {
          <section id="companies" class="mt-12 scroll-mt-24" aria-labelledby="companies-heading">
            <h2 id="companies-heading" class="cr-eyebrow">Engineering at scale — by company</h2>
            <p class="mt-2 max-w-2xl text-sm text-ink-soft">
              Real architecture stories from the teams that built at planet scale.
            </p>
            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              @for (company of companies(); track company.slug) {
                <a
                  [routerLink]="['/topics', company.slug]"
                  class="cr-brand-card group flex items-center gap-3 rounded-2xl border border-edge bg-surface/70 p-3 backdrop-blur-sm sm:p-4"
                  [style.--brand]="brandOf(company.slug)"
                >
                  <app-topic-mark [slug]="company.slug" [name]="company.name" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-bold text-ink">{{ company.name }}</span>
                    <span class="text-xs text-ink-faint">{{ company.count }} {{ company.count === 1 ? 'article' : 'articles' }}</span>
                  </span>
                </a>
              }
            </div>
          </section>
        }

        @if (tags().length > 0) {
          <section class="mt-12" aria-labelledby="tags-heading">
            <h2 id="tags-heading" class="cr-eyebrow">Tags</h2>
            <div class="mt-4 flex flex-wrap gap-2">
              @for (tag of tags(); track tag.slug) {
                <app-topic-chip [name]="tag.name" [slug]="tag.slug" [count]="tag.count" />
              }
            </div>
          </section>
        }

        @if (categories().length + companies().length + tags().length === 0) {
          <p class="py-16 text-center text-ink-soft">
            Nothing matches “{{ filter() }}”.
            <button type="button" class="font-semibold text-accent hover:text-accent-strong" (click)="filter.set('')">
              Clear the filter
            </button>
          </p>
        }
      </div>
    </div>
  `,
})
export class TopicIndex {
  protected readonly posts = inject(PostsService);
  protected readonly crumbs: Crumb[] = [{ label: 'Topics' }];
  protected readonly filter = signal('');

  private readonly matching = (topics: readonly TopicInfo[]) =>
    computed(() => {
      const query = this.filter().trim().toLowerCase();
      return query ? topics.filter((topic) => topic.name.toLowerCase().includes(query)) : topics;
    });

  protected readonly categories = this.matching(this.posts.techCategories);
  protected readonly companies = this.matching(this.posts.companyCategories);
  protected readonly tags = this.matching(this.posts.tags);

  constructor() {
    inject(SeoService).page('Topics');
  }

  protected brandOf(slug: string): string | null {
    return BRAND_COLORS[slug] ?? null;
  }
}
