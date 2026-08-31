import { Injectable, inject, signal } from '@angular/core';
import { PostMeta } from '../models/post.model';
import { PostsService } from './posts.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly postsService = inject(PostsService);

  /** Whether the global search dialog is open. */
  readonly dialogOpen = signal(false);

  search(query: string, limit = 8): PostMeta[] {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0 || query.trim().length < 2) {
      return [];
    }

    return this.postsService.posts
      .map((post) => ({ post, score: this.score(post, terms) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt),
      )
      .slice(0, limit)
      .map((entry) => entry.post);
  }

  /** Every term must match at least one field; fields are weighted by relevance. */
  private score(post: PostMeta, terms: string[]): number {
    const title = post.title.toLowerCase();
    const description = post.description.toLowerCase();
    const category = post.category.toLowerCase();
    const tags = post.tags.map((tag) => tag.toLowerCase());

    let total = 0;
    for (const term of terms) {
      let termScore = 0;
      if (title.includes(term)) termScore += title.startsWith(term) ? 8 : 5;
      if (tags.some((tag) => tag.includes(term))) termScore += 4;
      if (category.includes(term)) termScore += 3;
      if (description.includes(term)) termScore += 2;
      if (termScore === 0) return 0;
      total += termScore;
    }
    return total;
  }
}
