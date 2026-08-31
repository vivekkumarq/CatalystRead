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

const PAGE_SIZE = 24;
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { ArticleCard } from '../../shared/components/article-card/article-card';

@Component({
  selector: 'app-topic-detail',
  imports: [RouterLink, ArticleCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (topic(); as topic) {
      <div class="animate-page mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header class="max-w-2xl">
          <a routerLink="/topics" class="text-sm font-semibold text-accent hover:text-accent-strong">
            ← All topics
          </a>
          <p class="mt-4 text-xs font-bold uppercase tracking-wider text-ink-faint">
            {{ topic.kind === 'category' ? 'Category' : 'Tag' }}
          </p>
          <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {{ topic.name }}
          </h1>
          <p class="mt-3 text-ink-soft">
            {{ articles().length }} {{ articles().length === 1 ? 'article' : 'articles' }}
          </p>
        </header>

        <div class="stagger mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          @for (post of visible(); track post.slug) {
            <app-article-card [post]="post" />
          }
        </div>

        @if (visible().length < articles().length) {
          <div class="mt-10 text-center">
            <button
              type="button"
              (click)="loadMore()"
              class="rounded-xl border border-edge px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              Load more articles
            </button>
          </div>
        }
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
