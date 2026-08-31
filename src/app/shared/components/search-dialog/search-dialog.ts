import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';

@Component({
  selector: 'app-search-dialog',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (search.dialogOpen()) {
      <div
        class="animate-fade fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
        (click)="close()"
      >
        <div
          class="animate-pop w-full max-w-xl overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Search articles"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3 border-b border-edge px-4 transition-colors focus-within:border-accent/50">
            <svg class="size-4 shrink-0 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              #searchInput
              type="search"
              placeholder="Search articles, topics, tags…"
              autocomplete="off"
              class="h-14 w-full bg-transparent text-ink outline-none placeholder:text-ink-faint"
              [value]="query()"
              (input)="onInput($event)"
              (keydown)="onKeydown($event)"
            />
            <kbd class="shrink-0 rounded border border-edge bg-raised px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">Esc</kbd>
          </div>

          @if (results().length > 0) {
            <ul class="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              @for (post of results(); track post.slug; let i = $index) {
                <li role="option" [attr.aria-selected]="i === activeIndex()">
                  <a
                    [routerLink]="['/articles', post.slug]"
                    (click)="close()"
                    (mouseenter)="activeIndex.set(i)"
                    class="flex items-baseline justify-between gap-4 rounded-xl px-4 py-3 transition-colors"
                    [class.bg-raised]="i === activeIndex()"
                  >
                    <span>
                      <span class="block text-sm font-semibold text-ink">{{ post.title }}</span>
                      <span class="mt-0.5 block text-xs text-ink-faint">
                        {{ post.category }} · {{ post.readingTimeMinutes }} min read
                      </span>
                    </span>
                    <span class="text-xs text-accent" [class.invisible]="i !== activeIndex()" aria-hidden="true">↵</span>
                  </a>
                </li>
              }
            </ul>
          } @else if (query().trim().length >= 2) {
            <p class="p-8 text-center text-sm text-ink-faint">No articles found for "{{ query() }}".</p>
          } @else {
            <p class="p-8 text-center text-sm text-ink-faint">
              Search across article titles, descriptions, topics, and tags.
            </p>
          }
        </div>
      </div>
    }
  `,
})
export class SearchDialog {
  protected readonly search = inject(SearchService);
  private readonly router = inject(Router);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);
  protected readonly results = computed(() => this.search.search(this.query()));

  constructor() {
    afterRenderEffect(() => {
      if (this.search.dialogOpen()) {
        this.searchInput()?.nativeElement.focus();
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.search.dialogOpen.update((open) => !open);
    } else if (event.key === 'Escape' && this.search.dialogOpen()) {
      this.close();
    }
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const results = this.results();
    if (results.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const post = results[this.activeIndex()];
      if (post) {
        this.close();
        void this.router.navigate(['/articles', post.slug]);
      }
    }
  }

  protected close(): void {
    this.search.dialogOpen.set(false);
    this.query.set('');
    this.activeIndex.set(0);
  }
}
