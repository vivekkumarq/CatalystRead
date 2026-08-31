import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PostMeta } from '../models/post.model';
import { SITE } from '../constants/site';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  page(title: string, description: string = SITE.description): void {
    this.title.setTitle(title ? `${title} — ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title || SITE.name });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }

  article(post: PostMeta): void {
    this.page(post.title, post.description);
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'article:published_time', content: post.publishedAt });
    if (post.updatedAt) {
      this.meta.updateTag({ property: 'article:modified_time', content: post.updatedAt });
    }
    this.meta.updateTag({ property: 'article:section', content: post.category });
  }
}
