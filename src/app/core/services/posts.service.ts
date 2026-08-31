import { Injectable } from '@angular/core';
import { PostContent, PostMeta, TopicInfo } from '../models/post.model';
import { CATEGORIES, POSTS, POST_LOADERS, TAGS } from '../../generated/posts.generated';

@Injectable({ providedIn: 'root' })
export class PostsService {
  /** All posts, newest first (sort order fixed at build time). */
  readonly posts = POSTS;
  readonly categories = CATEGORIES;
  readonly tags = TAGS;

  readonly featured: readonly PostMeta[] = POSTS.filter((post) => post.featured).toSorted(
    (a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER),
  );

  /** Trending articles, newest first (POSTS is already date-sorted). */
  readonly trending: readonly PostMeta[] = POSTS.filter((post) => post.trending);

  /** Company categories (Netflix, Uber, …) — their posts carry the "Engineering at Scale" tag. */
  readonly companyCategories: readonly TopicInfo[] = CATEGORIES.filter((category) =>
    POSTS.some(
      (post) => post.categorySlug === category.slug && post.tags.includes('Engineering at Scale'),
    ),
  );

  readonly techCategories: readonly TopicInfo[] = CATEGORIES.filter(
    (category) => !this.companyCategories.includes(category),
  );

  bySlug(slug: string): PostMeta | undefined {
    return this.posts.find((post) => post.slug === slug);
  }

  topicBySlug(slug: string): TopicInfo | undefined {
    return (
      this.categories.find((topic) => topic.slug === slug) ??
      this.tags.find((topic) => topic.slug === slug)
    );
  }

  postsForTopic(topic: TopicInfo): PostMeta[] {
    if (topic.kind === 'category') {
      return this.posts.filter((post) => post.categorySlug === topic.slug);
    }
    return this.posts.filter((post) => post.tags.includes(topic.name));
  }

  related(post: PostMeta): PostMeta[] {
    return post.relatedSlugs
      .map((slug) => this.bySlug(slug))
      .filter((related): related is PostMeta => related !== undefined);
  }

  async loadContent(slug: string): Promise<PostContent> {
    const loader = POST_LOADERS[slug];
    if (!loader) {
      throw new Error(`No article found for slug "${slug}"`);
    }
    const module = await loader();
    return { html: module.POST_HTML, headings: module.POST_HEADINGS };
  }
}
