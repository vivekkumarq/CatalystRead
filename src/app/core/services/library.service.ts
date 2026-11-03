import { Injectable, computed, signal } from '@angular/core';

export interface HistoryEntry {
  slug: string;
  /** How far down the article the reader got, 0–100. */
  progress: number;
  /** Last read, epoch ms. */
  at: number;
}

const STORAGE_KEY = 'catalystread-library';
const HISTORY_LIMIT = 50;

/** The reader's saved articles and reading history, kept in localStorage.
    Starts empty and is filled by load() after the first render, so the
    prerendered HTML and the hydrated page match. */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  /** Saved slugs, most recently saved first. */
  readonly saved = signal<readonly string[]>([]);
  /** Reading history, most recent first. */
  readonly history = signal<readonly HistoryEntry[]>([]);
  /** False until load() has run; UI built from the library waits for it. */
  readonly ready = signal(false);

  private readonly savedSet = computed(() => new Set(this.saved()));
  private readonly historyMap = computed(
    () => new Map(this.history().map((entry) => [entry.slug, entry])),
  );

  readonly inProgress = computed(() =>
    this.history().filter((entry) => entry.progress >= 5 && entry.progress < 90),
  );

  load(): void {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (Array.isArray(raw.saved)) {
        this.saved.set(raw.saved.filter((slug: unknown) => typeof slug === 'string'));
      }
      if (Array.isArray(raw.history)) {
        this.history.set(
          raw.history.filter(
            (entry: HistoryEntry) =>
              typeof entry?.slug === 'string' &&
              typeof entry.progress === 'number' &&
              typeof entry.at === 'number',
          ),
        );
      }
    } catch {
      /* storage unavailable or corrupt; start empty */
    }
    this.ready.set(true);
  }

  isSaved(slug: string): boolean {
    return this.savedSet().has(slug);
  }

  entry(slug: string): HistoryEntry | undefined {
    return this.historyMap().get(slug);
  }

  toggleSaved(slug: string): void {
    this.saved.update((saved) =>
      saved.includes(slug) ? saved.filter((s) => s !== slug) : [slug, ...saved],
    );
    this.persist();
  }

  /** Records a visit; progress only ever moves forward, so re-opening a
      finished article doesn't mark it unread. */
  record(slug: string, progress: number): void {
    const previous = this.entry(slug)?.progress ?? 0;
    const entry = { slug, progress: Math.round(Math.max(previous, progress)), at: Date.now() };
    this.history.update((history) =>
      [entry, ...history.filter((e) => e.slug !== slug)].slice(0, HISTORY_LIMIT),
    );
    this.persist();
  }

  clearHistory(): void {
    this.history.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ saved: this.saved(), history: this.history() }),
      );
    } catch {
      /* storage unavailable; the library lasts for this visit only */
    }
  }
}
