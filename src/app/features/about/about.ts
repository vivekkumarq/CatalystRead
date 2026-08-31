import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/constants/site';
import { TopicChip } from '../../shared/components/topic-chip/topic-chip';

@Component({
  selector: 'app-about',
  imports: [RouterLink, TopicChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <p class="text-sm font-bold uppercase tracking-[0.2em] text-accent">About</p>
        <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {{ site.name }}
        </h1>
        <p class="mt-4 text-lg italic leading-relaxed text-ink-soft">{{ site.tagline }}</p>
      </header>

      <div class="article-body mt-10">
        <p>
          In chemistry, a catalyst accelerates a reaction without being consumed by it. That is the
          bar for every article published here: writing that speeds up the reaction between a hard
          technical idea and a working mental model — and stays useful long after the first read.
        </p>
        <p>
          {{ site.name }} is a personal technology publication by {{ site.author }}. It covers the
          craft of building software end to end: the JVM and Java, Spring Boot and backend
          engineering, Angular and React on the frontend, and the system design, architecture, and
          engineering judgment that tie it all together.
        </p>
        <h2 id="what-to-expect">What to expect</h2>
        <ul>
          <li><strong>Depth over breadth</strong> — fewer articles, each built around a mental model, not a changelog.</li>
          <li><strong>Real code</strong> — examples that resemble production systems, not toy demos.</li>
          <li><strong>Plain language</strong> — jargon only where it earns its place.</li>
        </ul>
        <h2 id="how-this-site-works">How this site works</h2>
        <p>
          The site itself practices what it publishes. It is a fully static site — every article is
          a Markdown file in the repository, compiled at build time into prerendered pages, and
          deployed straight from a git push. No servers, no database, no CMS.
        </p>
      </div>

      <section class="mt-12 border-t border-edge pt-10" aria-label="Topics covered">
        <h2 class="text-xl font-bold tracking-tight text-ink">Topics covered</h2>
        <div class="mt-5 flex flex-wrap gap-2.5">
          @for (category of posts.categories; track category.slug) {
            <app-topic-chip [name]="category.name" [slug]="category.slug" [count]="category.count" />
          }
        </div>
        <a
          routerLink="/articles"
          class="mt-8 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Start reading
        </a>
      </section>
    </div>
  `,
})
export class About {
  protected readonly posts = inject(PostsService);
  protected readonly site = SITE;

  constructor() {
    inject(SeoService).page('About');
  }
}
