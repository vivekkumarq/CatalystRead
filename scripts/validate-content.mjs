import { loadPosts } from './lib/content.mjs';

const { posts, errors } = await loadPosts();

if (errors.length > 0) {
  console.error('Content validation failed:\n');
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log(`All content valid — ${posts.length} article(s).\n`);
for (const post of posts) {
  const flags = post.featured ? ' [featured]' : '';
  console.log(`  ✓ ${post.publishedAt}  ${post.slug}  (${post.category}, ${post.readingTimeMinutes} min)${flags}`);
}
