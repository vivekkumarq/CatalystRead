export interface ArticleSource {
  title: string;
  author?: string;
  publisher?: string;
  url?: string;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: string;
  categorySlug: string;
  tags: string[];
  featured: boolean;
  trending: boolean;
  featuredOrder?: number;
  coverImage?: string;
  readingTimeMinutes: number;
  relatedSlugs: string[];
}

/** Lazily loaded article body; kept out of the metadata index for bundle size. */
export interface PostContent {
  html: string;
  headings: TocHeading[];
  sources: ArticleSource[];
}

export interface TopicInfo {
  name: string;
  slug: string;
  kind: 'category' | 'tag';
  count: number;
}
