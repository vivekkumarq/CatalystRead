# CatalystRead

> **Catalyzing ideas into understanding.**

A personal technology publication covering AI, machine learning, Java, Spring Boot, Angular, React, system design, DevOps, and software engineering — built as a fully static, Markdown-driven site with no backend, no database, and no CMS.

## Features

- **Markdown-first publishing** — every article is a `.md` file with YAML frontmatter; publishing is a git push
- **Fully static output** — every route is prerendered to plain HTML at build time (fast first paint, real SEO)
- **Premium reading experience** — editorial typography, reading progress bar, table of contents with scrollspy, syntax-highlighted code blocks with copy buttons, copy-link and share actions
- **Reader preferences** — font style (editorial / serif / sans) and text size, persisted per reader with no flash on load
- **Light & dark mode** — respects system preference, remembers manual choice, no flash on load
- **Instant search** — `Ctrl+K` opens a keyboard-navigable search dialog across titles, descriptions, topics, and tags
- **Trending & topics** — a `trending` frontmatter flag drives the home-page Trending section; categories, tags, and tag-similarity recommendations are computed at build time
- **Guest contributions** — the Contribute page generates a ready-to-submit article file; submissions arrive by email or pull request and are published only after review
- **RSS feed & sitemap** — generated on every build
- **Zero-config deploys** — GitHub Actions builds and publishes to GitHub Pages on every push to `main`

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Framework | Angular 22 (standalone components, signals, zoneless) |
| Language | TypeScript 6 (strict mode, strict templates) |
| Styling | Tailwind CSS v4 + semantic CSS custom properties |
| Content | Markdown + YAML frontmatter, compiled at build time |
| Highlighting | highlight.js, executed at build time (zero runtime cost) |
| Hosting | GitHub Pages via GitHub Actions |

Node.js is used only at development and build time. The deployed site is static files.

## Quick start

```bash
npm install
npm start          # generates content, serves at http://localhost:4200
```

Other commands:

```bash
npm run generate       # rebuild generated content from src/content
npm run watch:content  # regenerate automatically while editing articles
npm run validate       # check all article frontmatter
npm run build          # full production build + sitemap into dist/catalystread/browser
npm test               # unit tests
```

To preview the production build locally:

```bash
npx http-server dist/catalystread/browser -p 8080
```

## Publishing a new article

1. Create a Markdown file under `src/content/posts/<category-folder>/`, e.g. `src/content/posts/java/my-new-article.md`. (Folders are just organization — the `category` frontmatter field is what counts.)
2. Add frontmatter and write the article:

   ```markdown
   ---
   title: "Understanding JVM Memory Management"
   slug: "understanding-jvm-memory-management"
   description: "A deep dive into Java stack memory, heap memory, metaspace and garbage collection."
   publishedAt: "2026-09-01"
   category: "Java"
   tags:
     - Java
     - JVM
   ---

   Article content starts here…
   ```

3. Commit and push to `main`.

That's it. The article automatically appears in listings, search, its topic pages, related-article recommendations, the RSS feed, and the sitemap — no application code changes needed.

### Guest submissions

Readers can draft an article on the **/contribute** page, which generates a complete `.md` file (correct frontmatter included) and offers it for download, clipboard copy, or an email draft to the address configured in `src/app/core/constants/site.ts` (`contributeEmail`). Once the repository has a public GitHub URL, set `repoUrl` in the same file to also surface a "pull request" submission path. Publishing a submission is the same as publishing your own article: drop the file into `src/content/posts/` and push — nothing goes live without that explicit step.

### Frontmatter reference

| Field | Required | Notes |
| ----- | -------- | ----- |
| `title` | yes | Article headline |
| `slug` | yes | Lowercase kebab-case, unique; becomes `/articles/<slug>` |
| `description` | yes | Shown on cards, search, and meta tags |
| `publishedAt` | yes | `YYYY-MM-DD`; drives sort order |
| `updatedAt` | no | `YYYY-MM-DD`; shown when different from `publishedAt` |
| `category` | yes | Exactly one, e.g. `"Java"`; becomes a topic page |
| `tags` | yes | List of strings; each becomes a topic page |
| `featured` | no | `true` promotes the article to the home hero |
| `featuredOrder` | no | Number; lower wins when several are featured |
| `trending` | no | `true` lists the article in the home Trending section |
| `coverImage` | no | Path under `/assets/images/articles/` |

`npm run validate` (also run in CI) rejects bad frontmatter with a precise error before anything deploys.

## How it works

```
src/content/posts/**/*.md
        │  npm run generate (scripts/generate-content.mjs)
        ▼
src/app/generated/           ← gitignored, rebuilt on every build
  posts.generated.ts           metadata, topics, search index, lazy loaders
  posts/<slug>.ts              rendered HTML, one lazy chunk per article
        │  ng build (prerender)
        ▼
dist/catalystread/browser/   ← static HTML/CSS/JS for every route
        │  scripts/generate-sitemap.mjs
        ▼
sitemap.xml, robots.txt, 404.html, .nojekyll
```

At build time, Markdown is rendered to HTML, code is syntax-highlighted, heading anchors and tables of contents are extracted, reading time is computed, and related articles are scored by shared tags and category. The browser downloads none of that machinery — each article ships as a small prerendered page plus a ~2 kB lazy chunk.

## Deployment

1. Push this repository to GitHub.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually).

The workflow validates content, builds with the correct `--base-href` for project or user pages automatically, and deploys. No secrets or configuration needed.

## Project structure

```
├── .github/workflows/deploy.yml   # CI: validate → build → deploy to Pages
├── scripts/
│   ├── lib/content.mjs            # shared: scan, validate, render Markdown
│   ├── generate-content.mjs       # emits src/app/generated/*
│   ├── validate-content.mjs       # frontmatter linter (used by CI)
│   └── generate-sitemap.mjs       # sitemap, robots.txt, 404.html
├── src/
│   ├── app/
│   │   ├── core/                  # models, services (posts, search, seo, theme), constants
│   │   ├── shared/                # header, footer, cards, search dialog, TOC, pipes…
│   │   ├── features/              # home, articles, topics, search, about, not-found
│   │   └── generated/             # build artifacts (gitignored)
│   └── content/posts/             # ✍️ articles live here
└── public/assets/                 # favicon, article images
```

## License

[MIT](LICENSE)
