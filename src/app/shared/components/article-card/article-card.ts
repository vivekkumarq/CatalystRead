import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostMeta } from '../../../core/models/post.model';
import { PostsService } from '../../../core/services/posts.service';
import { LibraryService } from '../../../core/services/library.service';
import { FormatDatePipe } from '../../pipes/format-date.pipe';
import { TopicMark } from '../topic-mark/topic-mark';

@Component({
  selector: 'app-article-card',
  imports: [RouterLink, FormatDatePipe, TopicMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group h-full">
      <a
        [routerLink]="['/articles', post().slug]"
        (mouseenter)="posts.prefetch(post().slug)"
        (focus)="posts.prefetch(post().slug)"
        class="relative flex h-full flex-col overflow-hidden rounded-2xl border border-edge bg-surface/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-surface hover:shadow-xl hover:shadow-accent-soft sm:p-6"
      >
        <span
          class="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-accent to-accent-strong transition-transform duration-300 group-hover:scale-x-100"
          aria-hidden="true"
        ></span>

        <div class="flex items-center gap-2">
          <app-topic-mark [slug]="post().categorySlug" [name]="post().category" size="sm" />
          <span class="text-[11px] font-bold uppercase tracking-wider text-accent">
            {{ post().category }}
          </span>
          @if (saved()) {
            <svg class="ml-auto size-4 text-accent" viewBox="0 0 24 24" fill="currentColor" aria-label="Saved" role="img">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
            </svg>
          }
        </div>

        <h3 class="mt-3 text-[17px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent">
          {{ post().title }}
        </h3>

        <p class="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">
          {{ post().description }}
        </p>

        <div class="mt-5 flex items-center gap-2 text-xs text-ink-faint">
          <time [attr.datetime]="post().publishedAt">{{ post().publishedAt | formatDate }}</time>
          <span aria-hidden="true" class="size-0.5 rounded-full bg-current"></span>
          <span>{{ post().readingTimeMinutes }} min read</span>
          @if (progress(); as progress) {
            @if (progress >= 90) {
              <span class="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Read
              </span>
            } @else {
              <span class="font-semibold tabular-nums text-accent">{{ progress }}% read</span>
            }
          }
          <span
            class="ml-auto translate-x-1 font-semibold text-accent opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden="true"
          >
            Read →
          </span>
        </div>

        @if (progress(); as progress) {
          @if (progress < 90) {
            <span class="absolute inset-x-0 bottom-0 h-0.5 bg-raised" aria-hidden="true">
              <span class="block h-full bg-accent" [style.width.%]="progress"></span>
            </span>
          }
        }
      </a>
    </article>
  `,
})
export class ArticleCard {
  readonly post = input.required<PostMeta>();
  protected readonly posts = inject(PostsService);
  private readonly library = inject(LibraryService);

  protected readonly saved = computed(() => this.library.isSaved(this.post().slug));
  /** 0 (falsy) when unread, so the template shows nothing. */
  protected readonly progress = computed(() => this.library.entry(this.post().slug)?.progress ?? 0);
}
