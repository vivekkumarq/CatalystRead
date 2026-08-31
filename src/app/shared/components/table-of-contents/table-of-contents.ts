import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TocHeading } from '../../../core/models/post.model';

@Component({
  selector: 'app-table-of-contents',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Table of contents" class="text-sm">
      <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-ink-faint">On this page</h2>
      <ul class="space-y-0.5 border-l border-edge">
        @for (heading of headings(); track heading.id) {
          <li>
            <a
              [routerLink]="[]"
              [fragment]="heading.id"
              class="-ml-px block border-l-2 py-1 pr-2 leading-snug transition-colors"
              [class.pl-3]="heading.level === 2"
              [class.pl-6]="heading.level === 3"
              [class.border-accent]="activeId() === heading.id"
              [class.text-accent]="activeId() === heading.id"
              [class.font-medium]="activeId() === heading.id"
              [class.border-transparent]="activeId() !== heading.id"
              [class.text-ink-soft]="activeId() !== heading.id"
            >
              {{ heading.text }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class TableOfContents {
  readonly headings = input.required<TocHeading[]>();
  protected readonly activeId = signal('');

  constructor() {
    afterRenderEffect((onCleanup) => {
      const headings = this.headings();
      if (headings.length === 0) {
        return;
      }
      const elements = headings
        .map((heading) => document.getElementById(heading.id))
        .filter((el): el is HTMLElement => el !== null);

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.activeId.set(entry.target.id);
            }
          }
        },
        { rootMargin: '-80px 0px -70% 0px' },
      );
      for (const el of elements) {
        observer.observe(el);
      }
      onCleanup(() => observer.disconnect());
    });
  }
}
