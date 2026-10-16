import type { Theme } from './theme';

/**
 * The bevels that make up the Windows 98 look. Both are drawn as inset box
 * shadows so they ride along with the theme's `shadow` slot and need no
 * special casing in the components.
 */
const RAISED =
  'inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf, inset -2px -2px 0 #000000, inset 2px 2px 0 #ffffff';
const SUNKEN =
  'inset -1px -1px 0 #ffffff, inset 1px 1px 0 #808080, inset -2px -2px 0 #dfdfdf, inset 2px 2px 0 #000000';

const MONO =
  'ui-monospace, "SFMono-Regular", "SF Mono", "Cascadia Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';

const SYSTEM_SANS =
  'Tahoma, "MS Sans Serif", "Segoe UI", Geneva, Verdana, sans-serif';

/**
 * A terminal in the spirit of htop: flat black, no blur, square corners and a
 * monospace face, with the meter colours lifted from htop's own palette.
 */
export const htopTheme: Theme = {
  dark: true,
  id: 'htop',

  colors: {
    primary: '#00d75f',
    secondary: '#00afaf',
    error: '#d70000',

    surface: '#1c1c1c',
    background: '#000000',

    text: '#d0d0d0',

    cpuPrimary: '#00d75f',
    ramPrimary: '#00afaf',
    storagePrimary: '#d7af00',
    networkPrimary: '#d75f5f',
    gpuPrimary: '#af5fd7',
    containersPrimary: '#d7875f',
  },

  pane: {
    radius: '0px',
    background: '#0f0f0f',
    border: '1px solid #3a3a3a',
    backdropFilter: 'none',
    shadow: 'none',
  },

  chart: {
    radiusOuter: '0px',
    radiusInner: '0px',
    shadow: 'none',
    bevel: 'none',
  },

  icon: {
    radius: '0px',
    shadow: 'none',
    foreground: '#d0d0d0',
  },

  background: '#000000',
  font: MONO,
};

/**
 * Windows 98's chrome: the teal desktop, gray windows with raised bevels,
 * square corners and the system face. Chart cards sit like sunken list boxes.
 */
export const win98Theme: Theme = {
  dark: false,
  id: 'win98',

  colors: {
    primary: '#000080',
    secondary: '#008080',
    error: '#ff0000',

    surface: '#ffffff',
    background: '#008080',

    text: '#000000',

    cpuPrimary: '#000080',
    ramPrimary: '#008000',
    storagePrimary: '#808000',
    networkPrimary: '#008080',
    gpuPrimary: '#800080',
    containersPrimary: '#ff8000',
  },

  pane: {
    radius: '0px',
    background: '#c0c0c0',
    border: 'none',
    backdropFilter: 'none',
    shadow: RAISED,
  },

  chart: {
    radiusOuter: '0px',
    radiusInner: '0px',
    shadow: 'none',
    bevel: SUNKEN,
  },

  icon: {
    radius: '0px',
    shadow: RAISED,
    // the tiles are deep Win98 palette colours, so the glyph has to be white
    // rather than the theme's black text
    foreground: '#ffffff',
  },

  background: '#008080',
  font: SYSTEM_SANS,
};
