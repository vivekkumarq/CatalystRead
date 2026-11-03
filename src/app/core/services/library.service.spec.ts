import { LibraryService } from './library.service';

describe('LibraryService', () => {
  beforeEach(() => localStorage.clear());

  it('only moves reading progress forward and survives a reload', () => {
    const library = new LibraryService();
    library.load();
    library.record('a', 60);
    library.record('a', 0);
    library.toggleSaved('a');

    const reloaded = new LibraryService();
    expect(reloaded.ready()).toBe(false);
    reloaded.load();
    expect(reloaded.entry('a')?.progress).toBe(60);
    expect(reloaded.isSaved('a')).toBe(true);
    expect(reloaded.inProgress().map((entry) => entry.slug)).toEqual(['a']);

    reloaded.toggleSaved('a');
    expect(reloaded.isSaved('a')).toBe(false);
  });

  it('starts empty when storage holds something unexpected', () => {
    localStorage.setItem('catalystread-library', '{"saved":[1,"ok"],"history":[{"slug":"x"}]}');
    const library = new LibraryService();
    library.load();
    expect(library.saved()).toEqual(['ok']);
    expect(library.history()).toEqual([]);

    localStorage.setItem('catalystread-library', 'not json');
    const broken = new LibraryService();
    broken.load();
    expect(broken.ready()).toBe(true);
    expect(broken.saved()).toEqual([]);
  });
});
