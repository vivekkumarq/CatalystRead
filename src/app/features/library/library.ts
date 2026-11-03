import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostMeta } from '../../core/models/post.model';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { LibraryService } from '../../core/services/library.service';
import { ArticleCard } from '../../shared/components/article-card/article-card';
import { Breadcrumbs, Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';
import { TopicMark } from '../../shared/components/topic-mark/topic-mark';

@Component({
  selector: 'app-library',
  imports: [RouterLink, ArticleCard, Breadcrumbs, TopicMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band">
        <div class="cr-aurora" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <app-breadcrumbs [crumbs]="crumbs" />
          <h1 class="mt-4 cr-heading font-extrabold text-ink">Your library</h1>
          <p class="mt-3 max-w-2xl text-[15px] text-ink-soft">
            Saved articles and your reading history. Kept only in this browser — no account, nothing sent anywhere.
          </p>
          @if (library.ready()) {
            <dl class="mt-6 flex flex-wrap gap-3">
              @for (stat of stats(); track stat.label) {
                <div class="rounded-2xl border border-edge bg-surface/70 px-4 py-3 backdrop-blur-sm">
                  <dt class="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{{ stat.label }}</dt>
                  <dd class="cr-gradient-num text-2xl font-extrabold tabular-nums">{{ stat.value }}</dd>
                </div>
              }
            </dl>
          }
        </div>
      </section>

      @if (library.ready()) {
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <section aria-labelledby="saved-heading">
            <h2 id="saved-heading" class="text-xl font-bold tracking-tight text-ink">Saved for later</h2>
            @if (saved().length > 0) {
              <div class="stagger mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                @for (post of saved(); track post.slug) {
                  <app-article-card [post]="post" />
                }
              </div>
            } @else {
              <div class="mt-5 rounded-2xl border border-dashed border-edge p-8 text-center text-sm text-ink-soft">
                Nothing saved yet. Tap
                <span class="font-semibold text-ink">Save</span> on any article to keep it here.
              </div>
            }
          </section>

          <section class="mt-14" aria-labelledby="history-heading">
            <div class="flex items-baseline justify-between gap-4">
              <h2 id="history-heading" class="text-xl font-bold tracking-tight text-ink">Reading history</h2>
              @if (history().length > 0) {
                <button
                  type="button"
                  (click)="library.clearHistory()"
                  class="text-sm font-semibold text-ink-faint transition-colors hover:text-accent"
                >
                  Clear history
                </button>
              }
            </div>
            @if (history().length > 0) {
              <ol class="mt-5 divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-surface/70 backdrop-blur-sm">
                @for (item of history(); track item.post.slug) {
                  <li>
                    <a
                      [routerLink]="['/articles', item.post.slug]"
                      (mouseenter)="posts.prefetch(item.post.slug)"
                      class="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-raised sm:px-5"
                    >
                      <app-topic-mark [slug]="item.post.categorySlug" [name]="item.post.category" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold text-ink transition-colors group-hover:text-accent">{{ item.post.title }}</span>
                        <span class="text-xs text-ink-faint">{{ item.post.category }} · {{ item.when }}</span>
                      </span>
                      <span class="hidden w-28 shrink-0 items-center gap-2 sm:flex">
                        <span class="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                          <span class="block h-full rounded-full bg-accent" [style.width.%]="item.progress"></span>
                        </span>
                        <span class="w-9 text-right text-xs font-medium tabular-nums text-ink-faint">{{ item.progress }}%</span>
                      </span>
                    </a>
                  </li>
                }
              </ol>
            } @else {
              <div class="mt-5 rounded-2xl border border-dashed border-edge p-8 text-center text-sm text-ink-soft">
                Articles you open will show up here.
                <a routerLink="/articles" class="font-semibold text-accent hover:text-accent-strong">Find something to read →</a>
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class Library {
  protected readonly posts = inject(PostsService);
  protected readonly library = inject(LibraryService);
  protected readonly crumbs: Crumb[] = [{ label: 'Library' }];

  protected readonly saved = computed(() =>
    this.library.saved().flatMap((slug) => this.posts.bySlug(slug) ?? []),
  );

  protected readonly history = computed(() =>
    this.library.history().flatMap((entry) => {
      const post: PostMeta | undefined = this.posts.bySlug(entry.slug);
      return post ? [{ post, progress: entry.progress, when: timeAgo(entry.at) }] : [];
    }),
  );

  protected readonly stats = computed(() => {
    const history = this.history();
    const finished = history.filter((item) => item.progress >= 90);
    return [
      { label: 'Saved', value: this.saved().length },
      { label: 'Opened', value: history.length },
      { label: 'Finished', value: finished.length },
      {
        label: 'Minutes read',
        value: Math.round(
          history.reduce((sum, item) => sum + (item.post.readingTimeMinutes * item.progress) / 100, 0),
        ),
      },
    ];
  });

  constructor() {
    inject(SeoService).page('Your library', 'Your saved articles and reading history on CatalystRead.');
  }
}

function timeAgo(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
