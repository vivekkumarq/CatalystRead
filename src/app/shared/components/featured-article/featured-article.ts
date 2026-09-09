import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostMeta } from '../../../core/models/post.model';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
  selector: 'app-featured-article',
  imports: [RouterLink, FormatDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group h-full">
      <a
        [routerLink]="['/articles', post().slug]"
        class="cr-band relative flex h-full flex-col justify-between rounded-3xl border border-edge bg-surface/70 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent-soft sm:p-10"
      >
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <svg class="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2 9.2 8.6 2 9.3l5.5 4.8L5.8 21 12 17.3 18.2 21l-1.7-6.9L22 9.3l-7.2-.7Z" />
              </svg>
              Featured
            </span>
            <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              {{ post().category }}
            </span>
          </div>

          <h2 class="mt-5 text-2xl font-extrabold leading-[1.15] tracking-tight text-ink transition-colors group-hover:text-accent sm:text-4xl">
            {{ post().title }}
          </h2>

          <p class="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
            {{ post().description }}
          </p>
        </div>

        <div class="mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-ink-faint">
          <time [attr.datetime]="post().publishedAt">{{ post().publishedAt | formatDate }}</time>
          <span aria-hidden="true" class="size-0.5 rounded-full bg-current"></span>
          <span>{{ post().readingTimeMinutes }} min read</span>
          <span class="ml-auto inline-flex items-center gap-1.5 font-semibold text-accent" aria-hidden="true">
            Read article
            <svg class="size-4 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </a>
    </article>
  `,
})
export class FeaturedArticle {
  readonly post = input.required<PostMeta>();
}
