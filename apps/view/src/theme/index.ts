import { darkTheme, lightTheme, type Theme, type ThemeId } from './theme';

/** the themes that ship with dashdot */
export const THEME_IDS: ThemeId[] = ['original'];

export const THEME_LABELS: Record<ThemeId, string> = {
  original: 'Original',
};

/** only `original` ships a light and a dark palette */
export const THEME_HAS_BOTH_MODES: Record<ThemeId, boolean> = {
  original: true,
};

export const getTheme = (_id: ThemeId, dark: boolean): Theme =>
  dark ? darkTheme : lightTheme;

export type { Theme, ThemeId };
