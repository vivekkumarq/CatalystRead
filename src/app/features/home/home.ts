import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/constants/site';
import { ArticleCard } from '../../shared/components/article-card/article-card';
import { FeaturedArticle } from '../../shared/components/featured-article/featured-article';
import { TopicChip } from '../../shared/components/topic-chip/topic-chip';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { Reveal } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ArticleCard, FeaturedArticle, TopicChip, FormatDatePipe, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band" aria-label="Introduction">
        <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div class="stagger mx-auto max-w-3xl text-center">
            <p class="inline-flex items-center gap-2 rounded-full border border-edge bg-surface/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent backdrop-blur-sm">
              <span class="size-1.5 rounded-full bg-accent"></span>
              {{ site.name }}
            </p>
            <h1 class="mt-5 text-[2rem] font-extrabold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              Catalyzing ideas into <span class="text-accent">understanding</span>.
            </h1>
            <p class="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-lg">
              {{ site.description }}
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                routerLink="/articles"
                class="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
              >
                Browse {{ posts.posts.length }} articles
              </a>
              <a
                routerLink="/topics"
                class="rounded-xl border border-edge bg-surface/60 px-6 py-3 text-sm font-semibold text-ink-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
              >
                Explore topics
              </a>
            </div>
          </div>

          <dl class="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3 sm:mt-14 sm:gap-6">
            @for (stat of stats(); track stat.label) {
              <div class="rounded-2xl border border-edge bg-surface/60 p-4 text-center backdrop-blur-sm">
                <dt class="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  {{ stat.label }}
                </dt>
                <dd class="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {{ stat.value }}
                </dd>
              </div>
            }
          </dl>
        </div>
      </section>

      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        @if (hero(); as hero) {
          <section class="py-12 sm:py-16" aria-label="Featured article">
            <app-featured-article [post]="hero" />
          </section>
        }

        @if (trending().length > 0) {
          <section appReveal class="border-t border-edge py-12 sm:py-14" aria-label="Trending articles">
            <div class="mb-8 flex items-center gap-3">
              <h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Trending now</h2>
              <svg class="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 7h6v6" />
                <path d="m22 7-8.5 8.5-5-5L2 17" />
              </svg>
            </div>
            <div class="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              @for (post of trending(); track post.slug; let i = $index) {
                <a
                  [routerLink]="['/articles', post.slug]"
                  class="group flex gap-4 border-b border-edge/60 pb-6 sm:border-0 sm:pb-0"
                >
                  <span class="text-2xl font-extrabold leading-none text-ink-faint/40 tabular-nums transition-colors duration-200 group-hover:text-accent sm:text-3xl" aria-hidden="true">
                    {{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}
                  </span>
                  <div class="min-w-0">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-accent">
                      {{ post.category }}
                    </span>
                    <h3 class="mt-1 font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent">
                      {{ post.title }}
                    </h3>
                    <p class="mt-1.5 text-xs text-ink-faint">
                      {{ post.publishedAt | formatDate }} · {{ post.readingTimeMinutes }} min read
                    </p>
                  </div>
                </a>
              }
            </div>
          </section>
        }

        <section appReveal class="border-t border-edge py-12 sm:py-14" aria-label="Latest articles">
          <div class="mb-6 flex items-baseline justify-between gap-4">
            <h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Latest articles</h2>
            <a routerLink="/articles" class="shrink-0 text-sm font-semibold text-accent hover:text-accent-strong">
              View all →
            </a>
          </div>
          <div class="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (post of latest(); track post.slug) {
              <app-article-card [post]="post" />
            }
          </div>
        </section>

        <section appReveal class="border-t border-edge py-12 sm:py-16" aria-label="Topics">
          <h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Explore by topic</h2>
          <div class="mt-6 flex flex-wrap gap-2">
            @for (category of posts.techCategories; track category.slug) {
              <app-topic-chip [name]="category.name" [slug]="category.slug" [count]="category.count" />
            }
          </div>

          @if (posts.companyCategories.length > 0) {
            <h2 class="mt-12 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Engineering at scale
            </h2>
            <p class="mt-2 max-w-2xl text-sm text-ink-soft">
              How the world's best product companies solved their hardest technical problems.
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              @for (company of posts.companyCategories; track company.slug) {
                <app-topic-chip [name]="company.name" [slug]="company.slug" [count]="company.count" />
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
})
export class Home {
  protected readonly posts = inject(PostsService);
  protected readonly site = SITE;

  protected readonly hero = computed(() => this.posts.featured[0]);
  protected readonly trending = computed(() => this.posts.trending.slice(0, 6));
  protected readonly latest = computed(() => {
    const heroSlug = this.hero()?.slug;
    return this.posts.posts.filter((post) => post.slug !== heroSlug).slice(0, 6);
  });

  protected readonly stats = computed(() => [
    { label: 'Articles', value: this.posts.posts.length },
    { label: 'Topics', value: this.posts.techCategories.length },
    { label: 'Companies', value: this.posts.companyCategories.length },
  ]);

  constructor() {
    inject(SeoService).page('');
  }
}
