import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { PostContent } from '../../core/models/post.model';
import { PostsService } from '../../core/services/posts.service';

/* Resolving the article content before activation means prerendered pages
   contain the full article body, and the reader never sees a
   half-loaded article shell. */
export const articleContentResolver: ResolveFn<PostContent | RedirectCommand> = async (route) => {
  const posts = inject(PostsService);
  const router = inject(Router);
  const slug = route.paramMap.get('slug') ?? '';
  try {
    return await posts.loadContent(slug);
  } catch {
    return new RedirectCommand(router.parseUrl('/404'));
  }
};
