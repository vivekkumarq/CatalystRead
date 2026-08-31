import { Pipe, PipeTransform } from '@angular/core';

/** Formats a YYYY-MM-DD content date as e.g. "Aug 25, 2026". */
@Pipe({ name: 'formatDate' })
export class FormatDatePipe implements PipeTransform {
  transform(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
