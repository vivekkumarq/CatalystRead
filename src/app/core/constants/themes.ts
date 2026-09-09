export type ThemeMode = 'light' | 'dark';

export interface ThemeOption {
  id: string;
  name: string;
  mode: ThemeMode;
  /** Preview swatch: page background, surface, accent. */
  swatch: readonly [string, string, string];
}

export const DEFAULT_LIGHT_THEME = 'paper';
export const DEFAULT_DARK_THEME = 'carbon';

/** Every theme here has a matching token block in styles.css. */
export const THEMES: readonly ThemeOption[] = [
  { id: 'paper', name: 'Paper', mode: 'light', swatch: ['#faf8f5', '#ffffff', '#c2410c'] },
  { id: 'frost', name: 'Frost', mode: 'light', swatch: ['#f7f9fc', '#ffffff', '#2563eb'] },
  { id: 'sepia', name: 'Sepia', mode: 'light', swatch: ['#f5ecd9', '#fdf7ea', '#a1571f'] },
  { id: 'mint', name: 'Mint', mode: 'light', swatch: ['#f4faf8', '#ffffff', '#0f766e'] },
  { id: 'carbon', name: 'Carbon', mode: 'dark', swatch: ['#161311', '#26211c', '#fb923c'] },
  { id: 'midnight', name: 'Midnight', mode: 'dark', swatch: ['#0b1220', '#17253d', '#56b6f5'] },
  { id: 'nord', name: 'Nord', mode: 'dark', swatch: ['#2e3440', '#3d4351', '#88c0d0'] },
  { id: 'forest', name: 'Forest', mode: 'dark', swatch: ['#0d1a14', '#182f24', '#4ade80'] },
];

export const THEME_IDS: readonly string[] = THEMES.map((theme) => theme.id);
