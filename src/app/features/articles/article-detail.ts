import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PostContent } from '../../core/models/post.model';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { ArticleCard } from '../../shared/components/article-card/article-card';
import { ReadingProgress } from '../../shared/components/reading-progress/reading-progress';
import { TableOfContents } from '../../shared/components/table-of-contents/table-of-contents';
import { TopicChip } from '../../shared/components/topic-chip/topic-chip';
import { Breadcrumbs } from '../../shared/components/breadcrumbs/breadcrumbs';
import { FormatDatePipe } from '../../shared/pipes/format-date.pipe';
import { Reveal } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-article-detail',
  imports: [
    RouterLink,
    ArticleCard,
    ReadingProgress,
    TableOfContents,
    TopicChip,
    Breadcrumbs,
    FormatDatePipe,
    Reveal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-reading-progress />

    @if (post(); as post) {
      <div class="animate-page">
        <section class="cr-band">
          <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
            <div class="max-w-3xl">
              <app-breadcrumbs [crumbs]="crumbs()" />

              <a
                [routerLink]="['/topics', post.categorySlug]"
                class="mt-5 inline-block rounded-md bg-accent-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent transition-colors hover:text-accent-strong"
              >
                {{ post.category }}
              </a>

              <h1 class="mt-4 text-[1.75rem] font-extrabold leading-[1.18] tracking-tight text-ink sm:text-4xl lg:text-[2.6rem]">
                {{ post.title }}
              </h1>

              <p class="mt-4 text-[15px] leading-relaxed text-ink-soft sm:text-lg">
                {{ post.description }}
              </p>

              <div class="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-3 border-t border-edge/70 pt-4 text-sm text-ink-faint">
                <time [attr.datetime]="post.publishedAt">{{ post.publishedAt | formatDate }}</time>
                @if (post.updatedAt && post.updatedAt !== post.publishedAt) {
                  <span aria-hidden="true" class="size-0.5 rounded-full bg-current"></span>
                  <span>Updated {{ post.updatedAt | formatDate }}</span>
                }
                <span aria-hidden="true" class="size-0.5 rounded-full bg-current"></span>
                <span>{{ post.readingTimeMinutes }} min read</span>

                <span class="flex w-full items-center gap-1.5 sm:ml-auto sm:w-auto">
                  <button
                    type="button"
                    (click)="copyLink()"
                    class="flex h-8 items-center gap-1.5 rounded-lg border border-edge bg-surface/60 px-2.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
                    [attr.aria-label]="linkCopied() ? 'Link copied' : 'Copy link to this article'"
                  >
                    @if (linkCopied()) {
                      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Copied
                    } @else {
                      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                        <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                      </svg>
                      Copy link
                    }
                  </button>
                  <button
                    type="button"
                    (click)="shareOn('x')"
                    class="grid size-8 place-items-center rounded-lg border border-edge bg-surface/60 text-ink-soft transition-colors hover:border-accent hover:text-accent"
                    aria-label="Share on X"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93ZM17.6 20.64h2.04L6.49 3.24H4.3Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    (click)="shareOn('linkedin')"
                    class="grid size-8 place-items-center rounded-lg border border-edge bg-surface/60 text-ink-soft transition-colors hover:border-accent hover:text-accent"
                    aria-label="Share on LinkedIn"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_230px] lg:gap-12">
            <div class="w-full max-w-3xl">
              <div class="article-body" [innerHTML]="safeHtml()" (click)="onBodyClick($event)"></div>

              <footer class="mt-12">
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                  Tagged
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (tag of tagChips(); track tag.slug) {
                    <app-topic-chip [name]="tag.name" [slug]="tag.slug" />
                  }
                </div>
              </footer>

              @if (related().length > 0) {
                <section appReveal class="mt-14 border-t border-edge pt-10" aria-label="Related articles">
                  <h2 class="text-xl font-bold tracking-tight text-ink">Keep reading</h2>
                  <div class="mt-6 grid gap-5 sm:grid-cols-2">
                    @for (relatedPost of related(); track relatedPost.slug) {
                      <app-article-card [post]="relatedPost" />
                    }
                  </div>
                </section>
              }
            </div>

            <aside class="hidden lg:block" aria-label="Article navigation">
              @if (content().headings.length > 1) {
                <div class="sticky top-24">
                  <app-table-of-contents [headings]="content().headings" />
                </div>
              }
            </aside>
          </div>
        </div>
      </div>
    }
  `,
})
export class ArticleDetail {
  /** Route param, bound by the router. */
  readonly slug = input.required<string>();
  /** Resolved article body, bound by the router from articleContentResolver. */
  readonly content = input.required<PostContent>();

  private readonly postsService = inject(PostsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);

  protected readonly linkCopied = signal(false);

  protected readonly post = computed(() => this.postsService.bySlug(this.slug()));
  protected readonly related = computed(() => {
    const post = this.post();
    return post ? this.postsService.related(post) : [];
  });
  protected readonly tagChips = computed(() => {
    const post = this.post();
    if (!post) return [];
    return post.tags
      .map((name) => this.postsService.tags.find((tag) => tag.name === name))
      .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);
  });

  protected readonly crumbs = computed(() => {
    const post = this.post();
    return [
      { label: 'Articles', link: '/articles' },
      { label: post?.category ?? '', link: ['/topics', post?.categorySlug ?? ''] },
      { label: post?.title ?? '' },
    ];
  });

  /* The HTML is authored in this repository and rendered at build time,
     so bypassing sanitization here does not expose reader-supplied input. */
  protected readonly safeHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.content().html),
  );

  constructor() {
    effect(() => {
      const post = this.post();
      if (post) {
        this.seo.article(post);
      }
    });
  }

  protected copyLink(): void {
    const url = this.document.location.href;
    void navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }

  protected shareOn(network: 'x' | 'linkedin'): void {
    const url = encodeURIComponent(this.document.location.href);
    const title = encodeURIComponent(this.post()?.title ?? '');
    const shareUrl =
      network === 'x'
        ? `https://twitter.com/intent/tweet?url=${url}&text=${title}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  protected onBodyClick(event: Event): void {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.cr-copy');
    if (!button) {
      return;
    }
    const code = button.closest('.cr-code')?.querySelector('code')?.textContent ?? '';
    void navigator.clipboard.writeText(code).then(() => {
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);
    });
  }
}
