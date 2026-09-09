import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
  label: string;
  /** Omitted on the final crumb, which is the current page. */
  link?: string | readonly string[];
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="cr-scroll-x flex items-center gap-1.5 whitespace-nowrap text-[13px]">
        <li>
          <a routerLink="/" class="text-ink-faint transition-colors hover:text-accent">Home</a>
        </li>
        @for (crumb of crumbs(); track crumb.label; let last = $last) {
          <li aria-hidden="true" class="text-ink-faint/50">/</li>
          <li>
            @if (crumb.link && !last) {
              <a [routerLink]="crumb.link" class="text-ink-faint transition-colors hover:text-accent">
                {{ crumb.label }}
              </a>
            } @else {
              <span
                class="block max-w-[46vw] truncate font-medium text-ink-soft sm:max-w-none"
                aria-current="page"
              >
                {{ crumb.label }}
              </span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class Breadcrumbs {
  readonly crumbs = input.required<readonly Crumb[]>();
}
