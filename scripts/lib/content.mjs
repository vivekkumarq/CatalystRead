import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked } from 'marked';
import hljs from 'highlight.js';

export const CONTENT_DIR = path.resolve('src/content/posts');
export const GENERATED_DIR = path.resolve('src/app/generated');

const WORDS_PER_MINUTE = 220;
const RELATED_LIMIT = 3;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderMarkdown(markdown) {
  const headings = [];
  const seenIds = new Set();

  const uniqueId = (base) => {
    let id = base || 'section';
    let n = 2;
    while (seenIds.has(id)) id = `${base}-${n++}`;
    seenIds.add(id);
    return id;
  };

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const plain = html.replace(/<[^>]+>/g, '');
        const id = uniqueId(slugify(plain));
        if (depth === 2 || depth === 3) {
          headings.push({ id, text: plain, level: depth });
        }
        return `<h${depth} id="${id}">${html}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const requested = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
        const language = requested && hljs.getLanguage(requested) ? requested : '';
        const body = language
          ? hljs.highlight(text, { language }).value
          : escapeHtml(text);
        const label = language || requested || 'text';
        return (
          `<figure class="cr-code">` +
          `<figcaption class="cr-code-head">` +
          `<span class="cr-code-lang">${escapeHtml(label)}</span>` +
          `<button type="button" class="cr-copy" aria-label="Copy code to clipboard">Copy</button>` +
          `</figcaption>` +
          `<pre><code class="hljs language-${escapeHtml(label)}">${body}</code></pre>` +
          `</figure>\n`
        );
      },
      link({ href, title, tokens }) {
        const html = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        const external = /^https?:\/\//i.test(href ?? '');
        const externalAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(href ?? '')}"${titleAttr}${externalAttrs}>${html}</a>`;
      },
      image({ href, title, text }) {
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(href ?? '')}" alt="${escapeHtml(text ?? '')}"${titleAttr} loading="lazy" decoding="async" />`;
      },
    },
  });

  let html = marked.parse(markdown, { async: false });
  html = html
    .replaceAll('<table>', '<div class="cr-table-wrap"><table>')
    .replaceAll('</table>', '</table></div>');

  return { html, headings };
}

function readingTimeMinutes(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function validateFrontmatter(data, file) {
  const errors = [];
  const requireString = (key) => {
    if (typeof data[key] !== 'string' || data[key].trim() === '') {
      errors.push(`${file}: missing or empty required frontmatter field "${key}"`);
      return false;
    }
    return true;
  };

  requireString('title');
  requireString('description');
  requireString('category');

  if (requireString('slug') && !SLUG_PATTERN.test(data.slug)) {
    errors.push(`${file}: slug "${data.slug}" must be lowercase kebab-case`);
  }

  for (const key of ['publishedAt', 'updatedAt']) {
    const value = data[key];
    if (value === undefined) {
      if (key === 'publishedAt') errors.push(`${file}: missing required frontmatter field "publishedAt"`);
      continue;
    }
    const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    if (!DATE_PATTERN.test(text) || Number.isNaN(Date.parse(text))) {
      errors.push(`${file}: "${key}" must be a valid YYYY-MM-DD date`);
    }
  }

  if (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some((t) => typeof t !== 'string' || !t.trim())) {
    errors.push(`${file}: "tags" must be a non-empty list of strings`);
  }

  if (data.featured !== undefined && typeof data.featured !== 'boolean') {
    errors.push(`${file}: "featured" must be true or false`);
  }

  if (data.trending !== undefined && typeof data.trending !== 'boolean') {
    errors.push(`${file}: "trending" must be true or false`);
  }

  if (data.featuredOrder !== undefined && typeof data.featuredOrder !== 'number') {
    errors.push(`${file}: "featuredOrder" must be a number`);
  }

  if (data.coverImage !== undefined && typeof data.coverImage !== 'string') {
    errors.push(`${file}: "coverImage" must be a string path`);
  }

  if (data.sources !== undefined) {
    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      errors.push(`${file}: "sources" must be a non-empty list when present`);
    } else {
      data.sources.forEach((source, index) => {
        if (typeof source !== 'object' || source === null || Array.isArray(source)) {
          errors.push(`${file}: sources[${index}] must be a mapping with a "title"`);
          return;
        }
        if (typeof source.title !== 'string' || source.title.trim() === '') {
          errors.push(`${file}: sources[${index}] needs a non-empty "title"`);
        }
        for (const key of ['author', 'publisher', 'url']) {
          if (source[key] !== undefined && typeof source[key] !== 'string') {
            errors.push(`${file}: sources[${index}].${key} must be a string`);
          }
        }
        if (typeof source.url === 'string' && !/^https?:\/\//i.test(source.url)) {
          errors.push(`${file}: sources[${index}].url must start with http:// or https://`);
        }
      });
    }
  }

  return errors;
}

function toDateString(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

/** Drops blank optional fields so the generated modules stay tidy. */
function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources.map((source) => {
    const entry = { title: source.title.trim() };
    for (const key of ['author', 'publisher', 'url']) {
      const value = typeof source[key] === 'string' ? source[key].trim() : '';
      if (value) entry[key] = value;
    }
    return entry;
  });
}

export async function loadPosts() {
  let entries;
  try {
    entries = await readdir(CONTENT_DIR, { recursive: true });
  } catch {
    return { posts: [], errors: [`Content directory not found: ${CONTENT_DIR}`] };
  }

  const files = entries
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.split(path.sep).join('/'))
    .sort();

  const posts = [];
  const errors = [];
  const seenSlugs = new Map();

  for (const file of files) {
    const raw = await readFile(path.join(CONTENT_DIR, file), 'utf8');
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      errors.push(`${file}: invalid frontmatter — ${error.message}`);
      continue;
    }

    const fmErrors = validateFrontmatter(parsed.data, file);
    errors.push(...fmErrors);
    if (fmErrors.length > 0) continue;

    const slug = parsed.data.slug;
    if (seenSlugs.has(slug)) {
      errors.push(`${file}: duplicate slug "${slug}" (also used by ${seenSlugs.get(slug)})`);
      continue;
    }
    seenSlugs.set(slug, file);

    const { html, headings } = renderMarkdown(parsed.content);

    posts.push({
      slug,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      publishedAt: toDateString(parsed.data.publishedAt),
      updatedAt: parsed.data.updatedAt ? toDateString(parsed.data.updatedAt) : undefined,
      category: parsed.data.category.trim(),
      categorySlug: slugify(parsed.data.category),
      tags: parsed.data.tags.map((tag) => tag.trim()),
      featured: parsed.data.featured === true,
      trending: parsed.data.trending === true,
      featuredOrder: typeof parsed.data.featuredOrder === 'number' ? parsed.data.featuredOrder : undefined,
      coverImage: parsed.data.coverImage,
      readingTimeMinutes: readingTimeMinutes(parsed.content),
      headings,
      sources: normalizeSources(parsed.data.sources),
      sourceFile: file,
      html,
    });
  }

  posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));

  for (const post of posts) {
    post.relatedSlugs = relatedSlugsFor(post, posts);
  }

  return { posts, errors };
}

function relatedSlugsFor(post, posts) {
  const tagSet = new Set(post.tags.map((tag) => tag.toLowerCase()));
  return posts
    .filter((other) => other.slug !== post.slug)
    .map((other) => {
      const sharedTags = other.tags.filter((tag) => tagSet.has(tag.toLowerCase())).length;
      const sameCategory = other.categorySlug === post.categorySlug ? 1 : 0;
      return { slug: other.slug, score: sharedTags * 2 + sameCategory * 3 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, RELATED_LIMIT)
    .map((entry) => entry.slug);
}

export function collectTopics(posts) {
  const categories = new Map();
  const tags = new Map();

  for (const post of posts) {
    const category = categories.get(post.categorySlug) ?? {
      name: post.category,
      slug: post.categorySlug,
      kind: 'category',
      count: 0,
    };
    category.count += 1;
    categories.set(post.categorySlug, category);

    for (const tagName of post.tags) {
      const tagSlug = slugify(tagName);
      if (tagSlug === post.categorySlug) continue;
      const tag = tags.get(tagSlug) ?? { name: tagName, slug: tagSlug, kind: 'tag', count: 0 };
      tag.count += 1;
      tags.set(tagSlug, tag);
    }
  }

  const byCountThenName = (a, b) => b.count - a.count || a.name.localeCompare(b.name);
  return {
    categories: [...categories.values()].sort(byCountThenName),
    tags: [...tags.values()].sort(byCountThenName),
  };
}
