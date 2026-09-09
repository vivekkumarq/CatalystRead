import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { ArticleCard } from '../../shared/components/article-card/article-card';
import { Breadcrumbs } from '../../shared/components/breadcrumbs/breadcrumbs';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-topic-detail',
  imports: [ArticleCard, Breadcrumbs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (topic(); as topic) {
      <div class="animate-page">
        <section class="cr-band">
          <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <app-breadcrumbs [crumbs]="crumbs()" />
            <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {{ kindLabel() }}
            </p>
            <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {{ topic.name }}
            </h1>
            <p class="mt-3 text-[15px] text-ink-soft">
              {{ articles().length }} {{ articles().length === 1 ? 'article' : 'articles' }}
            </p>
          </div>
        </section>

        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div class="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (post of visible(); track post.slug) {
              <app-article-card [post]="post" />
            }
          </div>

          @if (visible().length < articles().length) {
            <div class="mt-10 text-center">
              <button
                type="button"
                (click)="loadMore()"
                class="rounded-xl border border-edge bg-surface/60 px-6 py-3 text-sm font-semibold text-ink-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent"
              >
                Load more articles
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class TopicDetail {
  readonly slug = input.required<string>();

  private readonly posts = inject(PostsService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly topic = computed(() => this.posts.topicBySlug(this.slug()));
  protected readonly articles = computed(() => {
    const topic = this.topic();
    return topic ? this.posts.postsForTopic(topic) : [];
  });

  protected readonly isCompany = computed(() =>
    this.posts.companyCategories.some((company) => company.slug === this.slug()),
  );

  protected readonly kindLabel = computed(() => {
    if (this.isCompany()) return 'Engineering at scale';
    return this.topic()?.kind === 'category' ? 'Category' : 'Tag';
  });

  protected readonly crumbs = computed(() => [
    { label: 'Topics', link: '/topics' },
    { label: this.topic()?.name ?? '' },
  ]);

  /* Resets to the first page whenever the topic changes. */
  protected readonly visibleCount = linkedSignal(() => {
    this.slug();
    return PAGE_SIZE;
  });

  protected readonly visible = computed(() => this.articles().slice(0, this.visibleCount()));

  protected loadMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  constructor() {
    effect(() => {
      const topic = this.topic();
      if (topic) {
        this.seo.page(`${topic.name} articles`, `Articles about ${topic.name} on CatalystRead.`);
      } else if (this.isBrowser) {
        void this.router.navigateByUrl('/404', { replaceUrl: true });
      }
    });
  }
}
