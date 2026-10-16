/**
 * A theme describes two things: the colours a widget paints itself with, and
 * the *material* the widgets are built from. The second group is what makes a
 * theme more than a repaint - it carries the pane shape, whether it blurs what
 * is behind it, how the chart cards are raised, and the typeface. Components
 * read these instead of hardcoding the glass look, so switching theme swaps the
 * material wholesale.
 */

/** the themes the view knows how to build */
export type ThemeId = 'original' | 'htop' | 'win98';

type Theme = {
  dark: boolean;
  id: ThemeId;

  colors: {
    primary: string;
    secondary: string;
    error: string;

    surface: string;
    background: string;

    text: string;

    cpuPrimary: string;
    ramPrimary: string;
    storagePrimary: string;
    networkPrimary: string;
    gpuPrimary: string;
    containersPrimary: string;
  };

  /** the widget pane - the glass sheet that holds an icon, info and charts */
  pane: {
    radius: string;
    /** full CSS background; glass themes blur, solid themes simply fill */
    background: string;
    border: string;
    backdropFilter: string;
    /** also carries bevels, which are drawn as inset shadows */
    shadow: string;
  };

  /** the cards the charts are drawn on */
  chart: {
    /** the corner facing out of the pane */
    radiusOuter: string;
    /** the corners facing into the pane */
    radiusInner: string;
    /** the offset drop shadow, drawn behind the card */
    shadow: string;
    /**
     * the edge drawn on the card itself. Inset bevels go here rather than in
     * `shadow` because that shadow sits behind the card and would hide them.
     */
    bevel: string;
  };

  /** the coloured tile behind a widget's icon */
  icon: {
    radius: string;
    shadow: string;
    /** the glyph on the tile - chosen to stay legible against this theme's tiles */
    foreground: string;
  };

  /** full CSS background for the page */
  background: string;

  font: string;
};

// ---------------------------------------------------------------------------
// original - the stock glassmorphism look
// ---------------------------------------------------------------------------

const originalLightColors: Theme['colors'] = {
  primary: '#5ee2ff',
  secondary: '#f5a4e3',
  error: '#f44336',

  surface: '#fafafa',
  background: '#d9d9d9',

  text: '#404040',

  cpuPrimary: '#52d7ff',
  ramPrimary: '#ff526f',
  storagePrimary: '#49e37a',
  networkPrimary: '#ffd745',
  gpuPrimary: '#c97bff',
  // deliberately warm: every other widget colour is cool or already taken,
  // so this stays distinguishable at a glance
  containersPrimary: '#ff8f3f',
};

const originalDarkColors: Theme['colors'] = {
  primary: '#775a9e',
  secondary: '#434047',
  error: originalLightColors.error,

  surface: '#212121',
  background: '#4f4f4f',

  text: '#fafafa',

  cpuPrimary: '#2259b3',
  ramPrimary: '#c43148',
  storagePrimary: '#22b352',
  networkPrimary: '#e9c235',
  gpuPrimary: '#a135eb',
  containersPrimary: '#e0701f',
};

const originalBackground = (colors: Theme['colors'], dark: boolean): string =>
  dark
    ? `radial-gradient(
  circle at 10% 10%,
  ${colors.primary} 10%,
  transparent 10.5%
),
radial-gradient(
  circle at 110% 90%,
  ${colors.secondary} 30%,
  transparent 30.5%
),
linear-gradient(
  290deg,
  ${colors.primary} 0%,
  ${colors.secondary} 40%
)`
    : `radial-gradient(
  circle at 10% 10%,
  ${colors.secondary}66 10%,
  transparent 10.2%
),
radial-gradient(circle at 10% 10%, #ffffff 10%, transparent 10.2%),
radial-gradient(
  circle at 90% 85%,
  ${colors.primary}66 20%,
  transparent 20.2%
),
radial-gradient(circle at 90% 85%, white 20%, transparent 20.2%),
linear-gradient(
  200deg,
  ${colors.primary} 0%,
  ${colors.secondary} 60%
)`;

// `background` is left out on purpose - it is the one value that differs
// between the light and dark palette, so each theme fills it in
const originalPane: Omit<Theme['pane'], 'background'> = {
  radius: '25px',
  border: '1px solid',
  backdropFilter: 'blur(20px)',
  shadow: 'none',
};

export const lightTheme: Theme = {
  dark: false,
  id: 'original',
  colors: originalLightColors,
  pane: {
    ...originalPane,
    border: `${originalPane.border} ${originalLightColors.text}33`,
    background: `${originalLightColors.surface}44`,
  },
  chart: {
    radiusOuter: '25px',
    radiusInner: '10px',
    shadow: '-13px -13px 35px 0px rgba(0, 0, 0, 0.15)',
    bevel: 'none',
  },
  icon: {
    radius: '10px',
    shadow: '13px 13px 35px 0px rgba(0, 0, 0, 0.15)',
    foreground: originalLightColors.text,
  },
  background: originalBackground(originalLightColors, false),
  font: '"Inter", sans-serif',
};

export const darkTheme: Theme = {
  dark: true,
  id: 'original',
  colors: originalDarkColors,
  pane: {
    ...originalPane,
    border: `${originalPane.border} ${originalDarkColors.text}33`,
    background: `${originalDarkColors.surface}44`,
  },
  chart: {
    radiusOuter: '25px',
    radiusInner: '10px',
    shadow: '-13px -13px 35px 0px rgba(0, 0, 0, 0.15)',
    bevel: 'none',
  },
  icon: {
    radius: '10px',
    shadow: '13px 13px 35px 0px rgba(0, 0, 0, 0.15)',
    foreground: originalDarkColors.text,
  },
  background: originalBackground(originalDarkColors, true),
  font: '"Inter", sans-serif',
};

export type { Theme };

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends Theme {}
}
