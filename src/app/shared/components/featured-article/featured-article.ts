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
        class="flex h-full flex-col justify-between rounded-3xl border border-edge bg-gradient-to-br from-surface to-raised p-8 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent-soft sm:p-10"
      >
        <div>
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <span class="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              Featured
            </span>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              {{ post().category }}
            </span>
          </div>
          <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink transition-colors group-hover:text-accent sm:text-3xl">
            {{ post().title }}
          </h2>
          <p class="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            {{ post().description }}
          </p>
        </div>
        <div class="mt-6 flex items-center gap-3 text-sm text-ink-faint">
          <time [attr.datetime]="post().publishedAt">{{ post().publishedAt | formatDate }}</time>
          <span aria-hidden="true">·</span>
          <span>{{ post().readingTimeMinutes }} min read</span>
          <span class="ml-auto font-semibold text-accent" aria-hidden="true">Read article →</span>
        </div>
      </a>
    </article>
  `,
})
export class FeaturedArticle {
  readonly post = input.required<PostMeta>();
}
