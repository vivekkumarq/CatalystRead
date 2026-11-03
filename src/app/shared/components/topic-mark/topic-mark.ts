import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRAND_COLORS } from '../../../core/constants/brands';

/** Line icons for technology categories that have no brand mark. */
const TOPIC_ICONS: Readonly<Record<string, string>> = {
  performance: 'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0',
  databases:
    'M3 5c0-1.66 4-3 9-3s9 1.34 9 3-4 3-9 3-9-1.34-9-3ZM3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3',
  'machine-learning':
    'M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 9h6v6H9Z',
  ai: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z',
  security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4',
  'system-design': 'M3 3h7v7H3ZM14 3h7v7h-7ZM14 14h7v7h-7ZM3 14h7v7H3Z',
  devops:
    'M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z',
  'web-development':
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z',
  'software-engineering': 'm8 9-3 3 3 3M16 9l3 3-3 3M13.5 6.5l-3 11',
  cloud: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z',
  career: 'M3 7h18v13H3ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
};

const SIZES = {
  sm: 'size-6 rounded-md [&_svg]:size-3.5 text-[11px]',
  md: 'size-10 rounded-xl [&_svg]:size-5 text-base',
  lg: 'size-12 rounded-2xl [&_svg]:size-6 text-lg',
  xl: 'size-16 rounded-2xl [&_svg]:size-8 text-2xl sm:size-20 sm:[&_svg]:size-10',
} as const;

/** A topic's visual: the company or technology logo, a line icon, or a
    lettered tile, on a tile tinted with the brand colour. */
@Component({
  selector: 'app-topic-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <span
      class="cr-mark-tile grid shrink-0 place-items-center font-extrabold"
      [class]="sizeClass()"
      [style.--brand]="brand()"
      aria-hidden="true"
    >
      @if (hasLogo()) {
        <svg viewBox="0 0 24 24" fill="currentColor"><use [attr.href]="'assets/logos.svg#' + slug()" /></svg>
      } @else if (icon(); as icon) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path [attr.d]="icon" />
        </svg>
      } @else {
        {{ name().charAt(0) }}
      }
    </span>
  `,
})
export class TopicMark {
  readonly slug = input.required<string>();
  readonly name = input('');
  readonly size = input<keyof typeof SIZES>('md');

  protected readonly hasLogo = computed(() => this.slug() in BRAND_COLORS);
  protected readonly icon = computed(() => TOPIC_ICONS[this.slug()]);
  /* Line icons and lettered tiles take the theme accent; black brands take ink. */
  protected readonly brand = computed(() =>
    this.hasLogo() ? (BRAND_COLORS[this.slug()] ?? 'var(--cr-ink)') : 'var(--cr-accent)',
  );
  protected readonly sizeClass = computed(() => SIZES[this.size()]);
}
