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
        class="flex h-full flex-col rounded-2xl border border-edge bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent-soft"
      >
        <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <span class="text-accent">{{ post().category }}</span>
          <span class="text-ink-faint" aria-hidden="true">·</span>
          <time [attr.datetime]="post().publishedAt" class="font-medium normal-case tracking-normal text-ink-faint">
            {{ post().publishedAt | formatDate }}
          </time>
        </div>
        <h3 class="text-lg font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-accent">
          {{ post().title }}
        </h3>
        <p class="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">
          {{ post().description }}
        </p>
        <div class="mt-4 flex items-center justify-between text-xs text-ink-faint">
          <span>{{ post().readingTimeMinutes }} min read</span>
          <span class="font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
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
