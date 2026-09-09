import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SearchService } from '../../core/services/search.service';
import { SeoService } from '../../core/services/seo.service';
import { ArticleCard } from '../../shared/components/article-card/article-card';

@Component({
  selector: 'app-search-page',
  imports: [ArticleCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band">
        <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Search</h1>
          <p class="mt-3 text-[15px] text-ink-soft">
            Find articles by title, description, topic, or tag.
          </p>
        </div>
      </section>

      <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div class="max-w-2xl">
        <label class="flex items-center gap-3 rounded-2xl border border-edge bg-surface px-5 focus-within:border-accent">
          <svg class="size-5 shrink-0 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search articles…"
            autocomplete="off"
            class="h-14 w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-faint"
            [value]="query()"
            (input)="onInput($event)"
            aria-label="Search articles"
          />
        </label>
      </div>

      @if (query().trim().length >= 2) {
        <p class="mt-8 text-sm text-ink-faint" role="status">
          {{ results().length }} {{ results().length === 1 ? 'result' : 'results' }} for
          "{{ query().trim() }}"
        </p>
        <div class="stagger mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (post of results(); track post.slug) {
            <app-article-card [post]="post" />
          }
        </div>
      } @else {
        <p class="mt-10 text-ink-faint">Start typing to search — at least two characters.</p>
      }
      </div>
    </div>
  `,
})
export class SearchPage {
  /** Bound from the "q" query parameter so search results are linkable.
      The router binds undefined when the parameter is absent. */
  readonly q = input<string | undefined>(undefined);

  private readonly search = inject(SearchService);
  private readonly router = inject(Router);

  protected readonly query = linkedSignal(() => this.q() ?? '');
  protected readonly results = computed(() => this.search.search(this.query(), 30));

  constructor() {
    inject(SeoService).page('Search');
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    void this.router.navigate([], {
      queryParams: { q: value.trim() || null },
      replaceUrl: true,
    });
  }
}
