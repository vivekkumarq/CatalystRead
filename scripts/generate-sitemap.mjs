import { access, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadPosts } from './lib/content.mjs';

const DIST_DIR = path.resolve('dist/catalystread/browser');
const SITE_URL = (process.env.SITE_URL ?? 'https://example.github.io/catalystread').replace(/\/+$/, '');

try {
  await access(DIST_DIR);
} catch {
  console.error(`Build output not found at ${DIST_DIR}. Run "npm run build" first.`);
  process.exit(1);
}

const { posts, errors } = await loadPosts();
if (errors.length > 0) {
  console.error('Cannot generate sitemap from invalid content.');
  process.exit(1);
}

const latestPostDate = posts[0]?.publishedAt;

const staticRoutes = ['', 'articles', 'topics', 'search', 'about', 'contribute'].map((route) => ({
  loc: route,
  lastmod: latestPostDate,
}));

const articleRoutes = posts.map((post) => ({
  loc: `articles/${post.slug}`,
  lastmod: post.updatedAt ?? post.publishedAt,
}));

const topicSlugs = new Set(posts.flatMap((post) => [post.categorySlug]));
const topicRoutes = [...topicSlugs].sort().map((slug) => ({
  loc: `topics/${slug}`,
  lastmod: latestPostDate,
}));

const urls = [...staticRoutes, ...articleRoutes, ...topicRoutes]
  .map(({ loc, lastmod }) => {
    const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
    return `  <url><loc>${SITE_URL}/${loc}${loc ? '/' : ''}</loc>${lastmodTag}</url>`;
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(path.join(DIST_DIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const feedItems = posts
  .slice(0, 30)
  .map((post) => {
    const url = `${SITE_URL}/articles/${post.slug}/`;
    const pubDate = new Date(`${post.publishedAt}T00:00:00Z`).toUTCString();
    return (
      `    <item>\n` +
      `      <title>${escapeXml(post.title)}</title>\n` +
      `      <link>${url}</link>\n` +
      `      <guid isPermaLink="true">${url}</guid>\n` +
      `      <description>${escapeXml(post.description)}</description>\n` +
      `      <category>${escapeXml(post.category)}</category>\n` +
      `      <pubDate>${pubDate}</pubDate>\n` +
      `    </item>`
    );
  })
  .join('\n');

const feed =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
  `  <channel>\n` +
  `    <title>CatalystRead</title>\n` +
  `    <link>${SITE_URL}/</link>\n` +
  `    <description>Catalyzing ideas into understanding. A personal technology publication.</description>\n` +
  `    <language>en</language>\n` +
  `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n` +
  `${feedItems}\n` +
  `  </channel>\n` +
  `</rss>\n`;

await writeFile(path.join(DIST_DIR, 'feed.xml'), feed, 'utf8');

/* GitHub Pages finalization: serve the prerendered not-found page for unknown
   URLs, and keep Pages from running the output through Jekyll. */
try {
  await copyFile(path.join(DIST_DIR, '404', 'index.html'), path.join(DIST_DIR, '404.html'));
} catch {
  console.warn('Prerendered 404 page not found; skipping 404.html.');
}
await writeFile(path.join(DIST_DIR, '.nojekyll'), '', 'utf8');

console.log(`Sitemap (${staticRoutes.length + articleRoutes.length + topicRoutes.length} URLs) and RSS feed written for ${SITE_URL}.`);
