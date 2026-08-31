import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-topic-chip',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/topics', slug()]"
      class="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface px-3 py-1 text-sm font-medium text-ink-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-md hover:shadow-accent-soft"
    >
      {{ name() }}
      @if (count() !== undefined) {
        <span class="text-xs text-ink-faint">{{ count() }}</span>
      }
    </a>
  `,
})
export class TopicChip {
  readonly name = input.required<string>();
  readonly slug = input.required<string>();
  readonly count = input<number>();
}
