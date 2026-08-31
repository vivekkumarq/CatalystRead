import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The CatalystRead mark: a rising molecule — three bonded ideas climbing upward. */
@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="cr-mark size-7 shrink-0" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" class="fill-accent" />
      <path stroke="#ffffff" stroke-width="3.5" fill="none" d="M20 44 L32 21 L44 40 M20 44 L44 40" />
      <circle cx="20" cy="44" r="5.5" fill="#ffffff" />
      <circle cx="32" cy="21" r="6.5" fill="#ffffff" />
      <circle cx="44" cy="40" r="5.5" fill="#ffffff" />
    </svg>
  `,
})
export class BrandMark {}
