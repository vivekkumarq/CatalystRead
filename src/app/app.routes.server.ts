import { RenderMode, ServerRoute } from '@angular/ssr';

/* Every route is prerendered to static HTML at build time; the deployed
   site is plain files with no server rendering at runtime. */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'articles/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const { POSTS } = await import('./generated/posts.generated');
      return POSTS.map((post) => ({ slug: post.slug }));
    },
  },
  {
    path: 'topics/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const { CATEGORIES, TAGS } = await import('./generated/posts.generated');
      return [...CATEGORIES, ...TAGS].map((topic) => ({ slug: topic.slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
