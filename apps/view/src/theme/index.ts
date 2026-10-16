import { htopTheme, win98Theme } from './palettes';
import { darkTheme, lightTheme, type Theme, type ThemeId } from './theme';

/** the themes that ship with dash.+ */
export const THEME_IDS: ThemeId[] = ['original', 'htop', 'win98'];

export const THEME_LABELS: Record<ThemeId, string> = {
  original: 'Original',
  htop: 'htop',
  win98: 'Windows 98',
};

/**
 * Only `original` ships a light and a dark palette. The other two are a single
 * fixed look, so the dark mode toggle has nothing to switch between and is
 * hidden while they are active.
 */
export const THEME_HAS_BOTH_MODES: Record<ThemeId, boolean> = {
  original: true,
  htop: false,
  win98: false,
};

export const getTheme = (id: ThemeId, dark: boolean): Theme => {
  switch (id) {
    case 'htop':
      return htopTheme;
    case 'win98':
      return win98Theme;
    // an id stored before a theme was added or removed falls back rather than
    // leaving the page unstyled
    default:
      return dark ? darkTheme : lightTheme;
  }
};

export type { Theme, ThemeId };
