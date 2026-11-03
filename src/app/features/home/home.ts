import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { SearchService } from '../../core/services/search.service';
import { LibraryService } from '../../core/services/library.service';
import { SITE } from '../../core/constants/site';
import { BRAND_COLORS } from '../../core/constants/brands';
import { ArticleCard } from '../../shared/components/article-card/article-card';
import { FeaturedArticle } from '../../shared/components/featured-article/featured-article';
import { TopicMark } from '../../shared/components/topic-mark/topic-mark';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { Reveal } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ArticleCard, FeaturedArticle, TopicMark, FormatDatePipe, Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band cr-hero" aria-label="Introduction">
        <div class="cr-aurora" aria-hidden="true"><span></span><span></span><span></span></div>

        <div class="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
          <div class="stagger mx-auto max-w-3xl text-center">
            @if (newest(); as newest) {
              <a
                [routerLink]="['/articles', newest.slug]"
                (mouseenter)="posts.prefetch(newest.slug)"
                class="group inline-flex max-w-full items-center gap-2 rounded-full border border-edge bg-surface/70 py-1 pl-1 pr-3 text-xs text-ink-soft shadow-sm backdrop-blur-sm transition-colors hover:border-accent/50"
              >
                <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  <span class="relative flex size-1.5">
                    <span class="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:hidden"></span>
                    <span class="relative inline-flex size-1.5 rounded-full bg-white"></span>
                  </span>
                  New
                </span>
                <span class="truncate font-medium transition-colors group-hover:text-ink">{{ newest.title }}</span>
                <span class="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </a>
            }

            <h1 class="cr-display mt-6 font-extrabold text-ink">
              Catalyzing ideas into <span class="cr-gradient-text">understanding</span>
            </h1>
            <p class="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-lg">
              {{ site.pitch }}
            </p>

            <button
              type="button"
              (click)="search.dialogOpen.set(true)"
              class="cr-glow-ring group mx-auto mt-8 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-edge bg-surface/85 px-4 py-3.5 text-left shadow-lg shadow-black/5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50"
              aria-label="Search articles"
            >
              <svg class="size-5 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span class="min-w-0 flex-1 truncate text-[15px] text-ink-faint">
                Search {{ posts.posts.length }} articles — try “Kafka”, “JVM” or “Netflix”
              </span>
              <kbd class="hidden shrink-0 rounded-md border border-edge bg-raised px-1.5 py-0.5 font-sans text-[10px] font-semibold text-ink-faint sm:inline">
                Ctrl K
              </kbd>
            </button>

            <div class="mt-5 flex flex-wrap justify-center gap-3">
              <a
                routerLink="/articles"
                class="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
              >
                Browse all articles
              </a>
              <button
                type="button"
                (click)="surprise()"
                class="group inline-flex items-center gap-2 rounded-xl border border-edge bg-surface/60 px-5 py-3 text-sm font-semibold text-ink-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
              >
                <svg class="size-4 transition-transform duration-500 group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
                  <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                </svg>
                Surprise me
              </button>
              <a
                routerLink="/topics"
                class="rounded-xl border border-edge bg-surface/60 px-5 py-3 text-sm font-semibold text-ink-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
              >
                Explore topics
              </a>
            </div>
          </div>

          <dl class="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            @for (stat of stats; track stat.label) {
              <div class="rounded-2xl border border-edge bg-surface/60 px-4 py-4 text-center backdrop-blur-sm">
                <dt class="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{{ stat.label }}</dt>
                <dd class="cr-gradient-num mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{{ stat.value }}</dd>
              </div>
            }
          </dl>
        </div>

        @if (marqueeRows.length > 0) {
          <div class="relative pb-10 sm:pb-14">
            <h2 class="mb-5 px-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
              Architecture stories from the engineering teams at
            </h2>
            <div class="flex flex-col gap-3">
              @for (row of marqueeRows; track $index; let odd = $odd) {
                <div class="cr-marquee" [class.cr-marquee-reverse]="odd">
                  <div class="cr-marquee-track">
                    @for (copy of copies; track copy) {
                      <ul class="cr-marquee-set" [attr.aria-hidden]="copy === 1 ? 'true' : null">
                        @for (company of row; track company.slug) {
                          <li>
                            <a
                              [routerLink]="['/topics', company.slug]"
                              [attr.tabindex]="copy === 1 ? -1 : null"
                              class="flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-edge bg-surface/70 py-2 pl-2 pr-4 text-sm font-semibold text-ink-soft backdrop-blur-sm transition-colors duration-200 hover:border-accent/40 hover:text-ink"
                            >
                              <app-topic-mark [slug]="company.slug" [name]="company.name" size="sm" />
                              {{ company.name }}
                            </a>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </section>

      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        @if (continueReading().length > 0) {
          <section class="animate-fade pt-12 sm:pt-14" aria-labelledby="continue-heading">
            <div class="mb-5 flex items-baseline justify-between gap-4">
              <h2 id="continue-heading" class="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                Pick up where you left off
              </h2>
              <a routerLink="/library" class="shrink-0 text-sm font-semibold text-accent hover:text-accent-strong">
                Your library →
              </a>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (item of continueReading(); track item.post.slug) {
                <a
                  [routerLink]="['/articles', item.post.slug]"
                  (mouseenter)="posts.prefetch(item.post.slug)"
                  class="group flex items-center gap-4 rounded-2xl border border-edge bg-surface/70 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent-soft"
                >
                  <app-topic-mark [slug]="item.post.categorySlug" [name]="item.post.category" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-bold tracking-tight text-ink transition-colors group-hover:text-accent">
                      {{ item.post.title }}
                    </p>
                    <div class="mt-2 flex items-center gap-2">
                      <span class="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                        <span class="block h-full rounded-full bg-accent" [style.width.%]="item.progress"></span>
                      </span>
                      <span class="shrink-0 text-xs font-medium tabular-nums text-ink-faint">{{ item.progress }}%</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          </section>
        }

        <section appReveal class="py-12 sm:py-16" aria-label="What this site is for">
          <div class="grid gap-5 sm:grid-cols-3">
            @for (use of uses; track use.title; let i = $index) {
              <div class="cr-lift group relative overflow-hidden rounded-2xl border border-edge bg-surface/70 p-6 backdrop-blur-sm">
                <span class="pointer-events-none absolute -top-4 right-3 select-none text-8xl font-extrabold text-ink/[0.05]" aria-hidden="true">
                  {{ i + 1 }}
                </span>
                <span class="grid size-11 place-items-center rounded-xl bg-accent text-white shadow-lg shadow-accent-soft transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" aria-hidden="true">
                  <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="use.icon" />
                  </svg>
                </span>
                <h2 class="mt-4 font-bold tracking-tight text-ink">{{ use.title }}</h2>
                <p class="mt-2 text-sm leading-relaxed text-ink-soft">{{ use.detail }}</p>
              </div>
            }
          </div>
        </section>

        @if (hero(); as hero) {
          <section class="border-t border-edge py-12 sm:py-16" aria-labelledby="start-heading">
            <p class="cr-eyebrow">Editor's pick</p>
            <h2 id="start-heading" class="mb-6 mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">Start here</h2>
            <app-featured-article [post]="hero" />
          </section>
        }

        @if (trending().length > 0) {
          <section appReveal class="border-t border-edge py-12 sm:py-14" aria-labelledby="trending-heading">
            <p class="cr-eyebrow">What readers open most</p>
            <div class="mb-8 mt-1 flex items-center gap-3">
              <h2 id="trending-heading" class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Trending now</h2>
              <svg class="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 7h6v6" />
                <path d="m22 7-8.5 8.5-5-5L2 17" />
              </svg>
            </div>
            <div class="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              @for (post of trending(); track post.slug; let i = $index) {
                <a
                  [routerLink]="['/articles', post.slug]"
                  (mouseenter)="posts.prefetch(post.slug)"
                  class="group flex gap-4 border-b border-edge/60 pb-6 sm:border-0 sm:pb-0"
                >
                  <span class="cr-gradient-num text-3xl font-extrabold leading-none tabular-nums opacity-45 transition-opacity duration-200 group-hover:opacity-100 sm:text-4xl" aria-hidden="true">
                    {{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}
                  </span>
                  <div class="min-w-0">
                    <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                      <app-topic-mark [slug]="post.categorySlug" [name]="post.category" size="sm" />
                      {{ post.category }}
                    </span>
                    <h3 class="mt-1.5 font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent">
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

        @if (topCompanies.length > 0) {
          <section appReveal class="border-t border-edge py-12 sm:py-16" aria-labelledby="companies-heading">
            <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="cr-eyebrow">Engineering at scale</p>
                <h2 id="companies-heading" class="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  How the best teams built it
                </h2>
                <p class="mt-2 max-w-xl text-sm text-ink-soft">
                  Documented architecture stories — the problem, the design, and what broke along the way.
                </p>
              </div>
              <a routerLink="/topics" fragment="companies" class="shrink-0 text-sm font-semibold text-accent hover:text-accent-strong">
                All {{ posts.companyCategories.length }} companies →
              </a>
            </div>
            <div class="stagger grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-6">
              @for (company of topCompanies; track company.slug) {
                <a
                  [routerLink]="['/topics', company.slug]"
                  class="cr-brand-card group flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-edge bg-surface/70 px-2 py-4 text-center backdrop-blur-sm sm:px-3 sm:py-5"
                  [style.--brand]="brandOf(company.slug)"
                >
                  <app-topic-mark [slug]="company.slug" [name]="company.name" size="lg" />
                  <span>
                    <span class="block text-sm font-bold tracking-tight text-ink sm:text-base">{{ company.name }}</span>
                    <span class="text-xs text-ink-faint">{{ company.count }} {{ company.count === 1 ? 'story' : 'stories' }}</span>
                  </span>
                </a>
              }
            </div>
          </section>
        }

        <section appReveal class="border-t border-edge py-12 sm:py-14" aria-labelledby="latest-heading">
          <div class="mb-6 flex items-end justify-between gap-4">
            <div>
              <p class="cr-eyebrow">Fresh off the press</p>
              <h2 id="latest-heading" class="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">Latest articles</h2>
            </div>
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

        <section appReveal class="border-t border-edge py-12 sm:py-16" aria-labelledby="topics-heading">
          <p class="cr-eyebrow">Go deep</p>
          <h2 id="topics-heading" class="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">Explore by topic</h2>
          <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            @for (category of posts.techCategories; track category.slug) {
              <a
                [routerLink]="['/topics', category.slug]"
                class="cr-lift group flex min-w-0 items-center gap-3 rounded-2xl border border-edge bg-surface/70 p-3 backdrop-blur-sm"
              >
                <app-topic-mark [slug]="category.slug" [name]="category.name" />
                <span class="min-w-0">
                  <span class="block text-sm font-bold leading-snug text-ink transition-colors group-hover:text-accent">{{ category.name }}</span>
                  <span class="text-xs text-ink-faint">{{ category.count }} articles</span>
                </span>
              </a>
            }
            <a
              routerLink="/topics"
              class="cr-lift flex items-center justify-center rounded-2xl border border-dashed border-edge p-3 text-sm font-semibold text-accent hover:border-accent"
            >
              All topics →
            </a>
          </div>
        </section>

        <section appReveal class="pb-16 sm:pb-20" aria-labelledby="cta-heading">
          <div class="cr-band relative rounded-3xl border border-edge px-6 py-10 text-center sm:px-12 sm:py-14">
            <div class="cr-aurora" aria-hidden="true"><span></span><span></span><span></span></div>
            <h2 id="cta-heading" class="cr-heading font-extrabold text-ink">Know something worth explaining?</h2>
            <p class="mx-auto mt-3 max-w-xl text-[15px] text-ink-soft">
              Guest articles are welcome. Write in Markdown, send it over, and it goes live after review.
            </p>
            <div class="mt-7 flex flex-wrap justify-center gap-3">
              <a
                routerLink="/contribute"
                class="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
              >
                Write for CatalystRead
              </a>
              <a
                href="feed.xml"
                class="rounded-xl border border-edge bg-surface/60 px-6 py-3 text-sm font-semibold text-ink-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
              >
                Subscribe via RSS
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class Home {
  protected readonly posts = inject(PostsService);
  protected readonly search = inject(SearchService);
  private readonly library = inject(LibraryService);
  private readonly router = inject(Router);
  protected readonly site = SITE;
  protected readonly copies = [0, 1];

  protected readonly newest = computed(() => this.posts.posts[0]);
  protected readonly hero = computed(() => this.posts.featured[0]);
  protected readonly trending = computed(() => this.posts.trending.slice(0, 6));
  protected readonly latest = computed(() => {
    const heroSlug = this.hero()?.slug;
    return this.posts.posts.filter((post) => post.slug !== heroSlug).slice(0, 6);
  });

  protected readonly continueReading = computed(() =>
    this.library.inProgress().flatMap((entry) => {
      const post = this.posts.bySlug(entry.slug);
      return post ? [{ post, progress: entry.progress }] : [];
    }).slice(0, 3),
  );

  protected readonly topCompanies = this.posts.companyCategories.slice(0, 12);

  /* Two rows of logos drifting in opposite directions. */
  protected readonly marqueeRows = (() => {
    const all = this.posts.companyCategories;
    const half = Math.ceil(all.length / 2);
    return all.length > 0 ? [all.slice(0, half), all.slice(half)] : [];
  })();

  /** Answers "what would I actually use this site for?" above the fold. */
  protected readonly uses = [
    {
      title: 'Understand a concept properly',
      detail:
        'Mental models rather than tutorials. Each article explains why something works the way it does, so the understanding outlives the next framework release.',
      icon: 'M12 3 2 8l10 5 10-5-10-5ZM2 16l10 5 10-5M2 12l10 5 10-5',
    },
    {
      title: 'Solve the problem on your desk',
      detail:
        'Concrete patterns for caching, error handling, migrations, query tuning, performance triage and security — with code you can adapt today.',
      icon: 'm8 9-3 3 3 3M16 9l3 3-3 3M13.5 6.5l-3 11',
    },
    {
      title: 'Prepare for design interviews',
      detail: `System design fundamentals plus the real architecture stories behind Netflix, Uber, Stripe and ${this.posts.companyCategories.length - 3} other companies that built at scale.`,
      icon: 'M3 3v16a2 2 0 0 0 2 2h16M7 15l4-5 3 3 5-7',
    },
  ];

  protected readonly stats = [
    { label: 'Articles', value: this.posts.posts.length },
    { label: 'Topics', value: this.posts.techCategories.length },
    { label: 'Companies', value: this.posts.companyCategories.length },
    { label: 'Hours of reading', value: this.posts.readingHours },
  ];

  constructor() {
    inject(SeoService).page('');
  }

  protected brandOf(slug: string): string | null {
    return BRAND_COLORS[slug] ?? null;
  }

  protected surprise(): void {
    void this.router.navigate(['/articles', this.posts.randomSlug()]);
  }
}
