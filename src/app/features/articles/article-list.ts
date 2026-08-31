import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { ArticleCard } from '../../shared/components/article-card/article-card';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-article-list',
  imports: [ArticleCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header class="max-w-2xl">
        <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">All articles</h1>
        <p class="mt-3 text-ink-soft">
          {{ posts.posts.length }} articles on engineering — newest first.
        </p>
      </header>

      <div class="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button
          type="button"
          (click)="activeCategory.set(null)"
          class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
          [class.border-accent]="activeCategory() === null"
          [class.bg-accent-soft]="activeCategory() === null"
          [class.text-accent]="activeCategory() === null"
          [class.border-edge]="activeCategory() !== null"
          [class.text-ink-soft]="activeCategory() !== null"
        >
          All
        </button>
        @for (category of filterCategories; track category.slug) {
          <button
            type="button"
            (click)="activeCategory.set(category.slug)"
            class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
            [class.border-accent]="activeCategory() === category.slug"
            [class.bg-accent-soft]="activeCategory() === category.slug"
            [class.text-accent]="activeCategory() === category.slug"
            [class.border-edge]="activeCategory() !== category.slug"
            [class.text-ink-soft]="activeCategory() !== category.slug"
          >
            {{ category.name }}
          </button>
        }
      </div>

      <div class="stagger mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        @for (post of visible(); track post.slug) {
          <app-article-card [post]="post" />
        } @empty {
          <p class="col-span-full py-12 text-center text-ink-faint">No articles in this category yet.</p>
        }
      </div>

      @if (visible().length < filtered().length) {
        <div class="mt-10 text-center">
          <p class="text-sm text-ink-faint">
            Showing {{ visible().length }} of {{ filtered().length }} articles
          </p>
          <button
            type="button"
            (click)="loadMore()"
            class="mt-3 rounded-xl border border-edge px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            Load more articles
          </button>
        </div>
      }
    </div>
  `,
})
export class ArticleList {
  protected readonly posts = inject(PostsService);
  protected readonly activeCategory = signal<string | null>(null);

  /* Tech categories first, then company categories. */
  protected readonly filterCategories = [
    ...this.posts.techCategories,
    ...this.posts.companyCategories,
  ];

  protected readonly filtered = computed(() => {
    const category = this.activeCategory();
    return category === null
      ? this.posts.posts
      : this.posts.posts.filter((post) => post.categorySlug === category);
  });

  /* Resets to the first page whenever the category filter changes. */
  protected readonly visibleCount = linkedSignal(() => {
    this.activeCategory();
    return PAGE_SIZE;
  });

  protected readonly visible = computed(() => this.filtered().slice(0, this.visibleCount()));

  protected loadMore(): void {
    this.visibleCount.update((count) => count + PAGE_SIZE);
  }

  constructor() {
    inject(SeoService).page('All articles');
  }
}
