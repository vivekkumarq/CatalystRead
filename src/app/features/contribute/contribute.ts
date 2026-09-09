import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PostsService } from '../../core/services/posts.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE } from '../../core/constants/site';
import { slugify } from '../../core/utilities/slugify';
import { Breadcrumbs, Crumb } from '../../shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-contribute',
  imports: [Breadcrumbs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="animate-page">
      <section class="cr-band">
        <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <app-breadcrumbs [crumbs]="crumbs" />
          <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            Contribute
          </p>
          <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Write for {{ site.name }}
          </h1>
          <p class="mt-4 text-[15px] leading-relaxed text-ink-soft sm:text-lg">
            Have a technical idea worth catalyzing? Guest articles are welcome. Fill in the form
            below — it generates a ready-to-submit article file. Every submission is personally
            reviewed before it's published.
          </p>
        </div>
      </section>

      <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <ol class="stagger grid gap-3 text-sm sm:grid-cols-3">
        @for (step of steps; track step.title; let i = $index) {
          <li class="rounded-2xl border border-edge bg-surface p-4">
            <span class="text-xs font-bold text-accent">Step {{ i + 1 }}</span>
            <p class="mt-1 font-semibold text-ink">{{ step.title }}</p>
            <p class="mt-1 leading-relaxed text-ink-faint">{{ step.detail }}</p>
          </li>
        }
      </ol>

      <form class="mt-10 space-y-6" (submit)="$event.preventDefault()">
        <div class="grid gap-6 sm:grid-cols-2">
          <label class="block">
            <span class="text-sm font-semibold text-ink">Your name</span>
            <input
              type="text"
              [value]="authorName()"
              (input)="authorName.set(asValue($event))"
              placeholder="Jane Doe"
              class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </label>
          <label class="block">
            <span class="text-sm font-semibold text-ink">Your email <span class="font-normal text-ink-faint">(for review feedback)</span></span>
            <input
              type="email"
              [value]="authorEmail()"
              (input)="authorEmail.set(asValue($event))"
              placeholder="jane@example.com"
              class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </label>
        </div>

        <label class="block">
          <span class="text-sm font-semibold text-ink">Article title *</span>
          <input
            type="text"
            [value]="title()"
            (input)="title.set(asValue($event))"
            placeholder="Understanding Database Indexes"
            class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
          @if (slug()) {
            <span class="mt-1 block text-xs text-ink-faint">URL: /articles/{{ slug() }}</span>
          }
        </label>

        <div class="grid gap-6 sm:grid-cols-2">
          <label class="block">
            <span class="text-sm font-semibold text-ink">Category *</span>
            <select
              [value]="category()"
              (change)="category.set(asValue($event))"
              class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-ink outline-none focus:border-accent"
            >
              <option value="" disabled>Select a category…</option>
              @for (cat of posts.categories; track cat.slug) {
                <option [value]="cat.name">{{ cat.name }}</option>
              }
            </select>
          </label>
          <label class="block">
            <span class="text-sm font-semibold text-ink">Tags <span class="font-normal text-ink-faint">(comma-separated)</span></span>
            <input
              type="text"
              [value]="tagsInput()"
              (input)="tagsInput.set(asValue($event))"
              placeholder="Databases, SQL, Performance"
              class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </label>
        </div>

        <label class="block">
          <span class="text-sm font-semibold text-ink">Short description *</span>
          <input
            type="text"
            [value]="description()"
            (input)="description.set(asValue($event))"
            placeholder="One sentence that sells the article (shown on cards and in search)."
            class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </label>

        <label class="block">
          <span class="text-sm font-semibold text-ink">Article body * <span class="font-normal text-ink-faint">(Markdown — ## headings, code fences, tables)</span></span>
          <textarea
            rows="14"
            [value]="body()"
            (input)="body.set(asValue($event))"
            placeholder="Start with an intro paragraph, then structure with ## sections…"
            class="mt-1.5 w-full rounded-xl border border-edge bg-surface px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          ></textarea>
        </label>
      </form>

      <div class="mt-8 rounded-2xl border border-edge bg-raised p-5">
        @if (isComplete()) {
          <p class="text-sm font-semibold text-ink">Your article file is ready — submit it your way:</p>
        } @else {
          <p class="text-sm text-ink-faint">Fill in the required fields (*) to generate your article file.</p>
        }
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            (click)="download()"
            [disabled]="!isComplete()"
            class="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download {{ slug() || 'article' }}.md
          </button>
          <button
            type="button"
            (click)="copyMarkdown()"
            [disabled]="!isComplete()"
            class="rounded-xl border border-edge px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {{ copied() ? 'Copied!' : 'Copy Markdown' }}
          </button>
          <button
            type="button"
            (click)="emailSubmission()"
            [disabled]="!isComplete()"
            class="rounded-xl border border-edge px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit by email
          </button>
          @if (site.repoUrl) {
            <a
              [href]="site.repoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-xl border border-edge px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              Open a pull request
            </a>
          }
        </div>
        <p class="mt-4 text-xs leading-relaxed text-ink-faint">
          "Submit by email" opens a draft in your mail client — attach the downloaded
          <code class="font-mono">.md</code> file if your article is long. Accepted articles are
          published with full credit to you.
        </p>
      </div>

      @if (isComplete()) {
        <details class="mt-6 rounded-2xl border border-edge bg-surface">
          <summary class="cursor-pointer px-5 py-3 text-sm font-semibold text-ink-soft">
            Preview the generated file
          </summary>
          <pre class="overflow-x-auto border-t border-edge px-5 py-4 font-mono text-xs leading-relaxed text-ink-soft">{{ markdown() }}</pre>
        </details>
      }
      </div>
    </div>
  `,
})
export class Contribute {
  protected readonly posts = inject(PostsService);
  protected readonly site = SITE;
  protected readonly crumbs: Crumb[] = [{ label: 'Contribute' }];
  private readonly document = inject(DOCUMENT);

  protected readonly authorName = signal('');
  protected readonly authorEmail = signal('');
  protected readonly title = signal('');
  protected readonly category = signal('');
  protected readonly tagsInput = signal('');
  protected readonly description = signal('');
  protected readonly body = signal('');
  protected readonly copied = signal(false);

  protected readonly steps = [
    { title: 'Write', detail: 'Draft your article in the form — Markdown supported.' },
    { title: 'Submit', detail: 'Send the generated file by email or open a pull request.' },
    { title: 'Review', detail: 'Once approved, it goes live with credit to you.' },
  ];

  protected readonly slug = computed(() => slugify(this.title()));

  protected readonly tags = computed(() =>
    this.tagsInput()
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  );

  protected readonly isComplete = computed(
    () =>
      this.title().trim() !== '' &&
      this.category() !== '' &&
      this.description().trim() !== '' &&
      this.body().trim() !== '',
  );

  protected readonly markdown = computed(() => {
    const tags = this.tags().length > 0 ? this.tags() : [this.category()];
    const tagLines = tags.map((tag) => `  - ${tag}`).join('\n');
    const today = new Date().toISOString().slice(0, 10);
    return [
      '---',
      `title: "${this.title().trim().replaceAll('"', "'")}"`,
      `slug: "${this.slug()}"`,
      `description: "${this.description().trim().replaceAll('"', "'")}"`,
      `publishedAt: "${today}"`,
      `category: "${this.category()}"`,
      'tags:',
      tagLines,
      '---',
      '',
      this.body().trim(),
      '',
    ].join('\n');
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected copyMarkdown(): void {
    void navigator.clipboard.writeText(this.markdown()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  protected download(): void {
    const blob = new Blob([this.markdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.slug() || 'article'}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected emailSubmission(): void {
    const author = this.authorName().trim() || 'Anonymous';
    const contact = this.authorEmail().trim();
    const intro =
      `Hi,\n\nI'd like to submit an article to ${this.site.name}.\n\n` +
      `Author: ${author}${contact ? ` (${contact})` : ''}\n` +
      `Title: ${this.title().trim()}\n` +
      `Category: ${this.category()}\n\n` +
      `--- article file below (or attached) ---\n\n`;
    const body = (intro + this.markdown()).slice(0, 1800);
    const mailto =
      `mailto:${this.site.contributeEmail}` +
      `?subject=${encodeURIComponent(`Article submission: ${this.title().trim()}`)}` +
      `&body=${encodeURIComponent(body)}`;
    this.document.location.href = mailto;
  }

  constructor() {
    inject(SeoService).page(
      'Contribute',
      'Submit a guest article to CatalystRead. Every submission is reviewed before publication.',
    );
  }
}
