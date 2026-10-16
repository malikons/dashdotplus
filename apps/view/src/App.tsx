import { ConfigProvider } from 'antd';
import { type FC, useLayoutEffect, useMemo } from 'react';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { useColorScheme } from 'use-color-scheme';
import { MainWidgetContainer } from './components/main-widget-container';
import { SingleWidgetChart } from './components/single-widget-chart';
import { MobileContextProvider } from './services/mobile';
import { useQuery } from './services/query-params';
import { useSetting } from './services/settings';
import { getTheme, type Theme } from './theme';

const GlobalStyle = createGlobalStyle<{ noBg: boolean }>`
  body {
    background-color: ${({ theme, noBg }) =>
      noBg ? 'transparent' : theme.colors.background};
    height: 100vh;
    width: 100vw;
    font-family: ${({ theme }) => theme.font};
  }

  #root {
    width: 100%;
    height: 100%;
    /* #root out-specifies the stylesheet's body rule, so this is what actually
       decides the face the page is set in */
    font-family: ${({ theme }) => theme.font};

    background: ${({ theme, noBg }) =>
      noBg ? 'transparent' : theme.background};

    transition: background 0.5s ease;
    background-attachment: fixed;
  }

  .ant-switch {
    background-color: rgba(0, 0, 0, 0.25);
    background-image: unset;
  }

  .ant-btn {
    /* original deliberately tints buttons with the page behind them; the two
       fixed themes have a flat page colour that would read as a stray block
       against their pane, so they tint with the pane instead */
    background: ${({ theme }) =>
      theme.id === 'original'
        ? theme.colors.background
        : theme.pane.background};
    border: none;
  }
`;

const overrideColor = (
  colors: Theme['colors'],
  query: ReturnType<typeof useQuery>,
) => {
  if (query.singleWidget) {
    if (query.overrideThemeColor) {
      colors.cpuPrimary = `#${query.overrideThemeColor}`;
      colors.storagePrimary = `#${query.overrideThemeColor}`;
      colors.ramPrimary = `#${query.overrideThemeColor}`;
      colors.networkPrimary = `#${query.overrideThemeColor}`;
      colors.gpuPrimary = `#${query.overrideThemeColor}`;
      colors.containersPrimary = `#${query.overrideThemeColor}`;
      colors.primary = `#${query.overrideThemeColor}`;
    }

    if (query.overrideThemeSurface) {
      colors.surface = `#${query.overrideThemeSurface}`;
    }
  }
};

export const App: FC = () => {
  const { scheme } = useColorScheme();
  const [darkMode] = useSetting('darkMode', scheme === 'dark');
  const [themeVariant] = useSetting('themeVariant', 'original');
  const query = useQuery();

  const theme = useMemo(() => {
    const baseTheme = getTheme(themeVariant, darkMode);

    if (query.singleWidget) {
      // an embedded chart pins itself to `original` unless told otherwise, so
      // the colour query params keep producing the exact look they always have
      const queryTheme = query.overrideTheme
        ? getTheme('original', query.overrideTheme === 'dark')
        : baseTheme;

      // copy before overriding - otherwise the query params would bleed into
      // the shared theme object for every other view
      const overridden: Theme = {
        ...queryTheme,
        colors: { ...queryTheme.colors },
      };
      overrideColor(overridden.colors, query);

      return overridden;
    }

    return baseTheme;
  }, [darkMode, themeVariant, query]);

  useLayoutEffect(() => {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute('content', theme.dark ? 'dark' : 'light');
    }
  }, [theme.dark]);

  return (
    <ThemeProvider theme={theme}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: theme.colors.primary,
            colorPrimaryHover: theme.colors.primary,
          },
        }}
      >
        <MobileContextProvider>
          {query.singleWidget ? <SingleWidgetChart /> : <MainWidgetContainer />}
        </MobileContextProvider>
      </ConfigProvider>
      <GlobalStyle noBg={query.singleWidget} />
    </ThemeProvider>
  );
};
