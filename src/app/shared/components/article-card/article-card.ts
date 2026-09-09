import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostMeta } from '../../../core/models/post.model';
import { FormatDatePipe } from '../../pipes/format-date.pipe';

@Component({
  selector: 'app-article-card',
  imports: [RouterLink, FormatDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group h-full">
      <a
        [routerLink]="['/articles', post().slug]"
        class="relative flex h-full flex-col overflow-hidden rounded-2xl border border-edge bg-surface/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-surface hover:shadow-xl hover:shadow-accent-soft sm:p-6"
      >
        <span
          class="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100"
          aria-hidden="true"
        ></span>

        <div class="flex items-center gap-2">
          <span class="rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
            {{ post().category }}
          </span>
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
          <span
            class="ml-auto translate-x-1 font-semibold text-accent opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden="true"
          >
            Read →
          </span>
        </div>
      </a>
    </article>
  `,
})
export class ArticleCard {
  readonly post = input.required<PostMeta>();
}
