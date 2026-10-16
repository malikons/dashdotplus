import type { Config, OsInfo, Transient } from '@dashdot/common';
import {
  faApple,
  faCentos,
  faDebian,
  faFedora,
  faGithub,
  faLinux,
  faRedhat,
  faSuse,
  faUbuntu,
  faWindows,
  type IconDefinition,
} from '@fortawesome/free-brands-svg-icons';
import { faServer } from '@fortawesome/free-solid-svg-icons';
import {
  FontAwesomeIcon,
  type FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';
import { Button, Tooltip } from 'antd';
import { fromUrl, ParseResultType, parseDomain } from 'parse-domain';
import { toUnicode } from 'punycode';
import { type FC, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { InfoTable } from '../components/info-table';
import { ThemedText } from '../components/text';
import { WidgetControls } from '../components/widget-controls';
import { WidgetSelect } from '../components/widget-select';
import { WidgetSwitch } from '../components/widget-switch';
import { useIsMobile } from '../services/mobile';
import { useSetting } from '../services/settings';
import {
  THEME_HAS_BOTH_MODES,
  THEME_IDS,
  THEME_LABELS,
  type ThemeId,
} from '../theme';
import { toInfoTable } from '../utils/format';

const Container = styled.div`
  position: relative;
  flex: 1;
  max-width: 100%;

  display: flex;
  flex-direction: column;
  padding: 25px;
`;

const Heading = styled(ThemedText)`
  width: 100%;
  margin-top: 31px;
  margin-bottom: 15px;

  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: flex-end;
  column-gap: 15px;

  font-size: 2rem;

  > * {
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    padding-bottom: 5px;
  }
`;

const Appendix = styled.span`
  font-size: 1.5rem;
`;

const ServerName = styled.span`
  font-weight: bold;
  text-decoration: underline;
  text-decoration-color: ${(props) => props.theme.colors.primary};
  position: relative;
  bottom: -3px;
  margin-top: 32px;
`;

const StandaloneAppendix = styled(ServerName)`
  font-size: 3rem;
  margin-top: 18px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

// holds the widget's buttons and its settings controls on one line. Wrapping
// is deliberate: a widget narrow enough that both cannot fit puts the controls
// on the line below rather than drawing them over the buttons.
const TopRow = styled.div`
  width: 100%;

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
`;

const Link = styled(Button)`
  border: none;

  &:active {
    > svg {
      color: ${(props) => props.theme.colors.primary};
    }
  }
  > svg {
    color: ${(props) => props.theme.colors.text};
  }
`;

const StyledInfoTable = styled(InfoTable)<Transient<{ mobile: boolean }>>`
  width: 100%;
  padding: 15px 5px ${({ $mobile }) => ($mobile ? 15 : 5)}px 5px;
`;

const SFontAwesomeIcon = styled(FontAwesomeIcon)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 17rem;
  opacity: 0.05;
  pointer-events: none;
`;

const ServerIcon: FC<{ os: string } & Omit<FontAwesomeIconProps, 'icon'>> = ({
  os,
  ...iconProps
}) => {
  const theme = useTheme();

  let icon: IconDefinition = faServer;

  if (os.includes('ubuntu')) {
    icon = faUbuntu;
  } else if (os.includes('debian')) {
    icon = faDebian;
  } else if (os.includes('suse')) {
    icon = faSuse;
  } else if (os.includes('redhat')) {
    icon = faRedhat;
  } else if (os.includes('fedora')) {
    icon = faFedora;
  } else if (os.includes('centos')) {
    icon = faCentos;
  } else if (os.includes('linux')) {
    icon = faLinux;
  } else if (
    os.includes('mac') ||
    os.includes('osx') ||
    os.includes('darwin') ||
    os.includes('apple')
  ) {
    icon = faApple;
  } else if (os.includes('win')) {
    icon = faWindows;
  }

  return (
    <SFontAwesomeIcon color={theme.colors.text} {...iconProps} icon={icon} />
  );
};

type ServerWidgetProps = {
  data: OsInfo;
  config: Config;
};

export const ServerWidget: FC<ServerWidgetProps> = ({ data, config }) => {
  const isMobile = useIsMobile();
  const [darkMode, setDarkMode] = useSetting('darkMode');
  const [themeVariant, setThemeVariant] = useSetting(
    'themeVariant',
    'original',
  );
  const [uptime, setUptime] = useState(0);

  const override = config.override;
  const days = Math.floor(uptime / (24 * 60 * 60));
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);

  // Client-side calculation of uptime
  useEffect(() => {
    const uptime = data.uptime ?? 0;

    let interval: NodeJS.Timeout;
    if (uptime > 0) {
      const startTime = Date.now();

      setUptime(uptime);
      interval = setInterval(() => {
        const passedTime = (Date.now() - startTime) / 1000;
        setUptime(uptime + passedTime);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [data.uptime]);

  const host = useMemo(() => {
    if (config?.custom_host) return config?.custom_host;

    const href = window.location.href;
    const result = parseDomain(fromUrl(href));

    if (result.type === ParseResultType.Listed) {
      const { domain, topLevelDomains } = result;
      return [toUnicode(domain ?? ''), ...topLevelDomains].join('.');
    } else {
      return undefined;
    }
  }, [config?.custom_host]);

  const uptimeStr =
    (days ? `${days} days\n` : '') +
    (hours ? `${hours} hours\n` : '') +
    (minutes ? `${minutes} minutes` : '');
  const distro = data.distro;
  const platform = data.platform;
  const os = override.os ?? `${distro} ${data.release}`;
  const arch = override.arch ?? data.arch;

  const ghBtn = (
    <Link
      ghost
      shape="circle"
      icon={<FontAwesomeIcon icon={faGithub} />}
      href="https://github.com/MauriceNino/dashdot"
      target="_blank"
      aria-label="GitHub Link"
    />
  );

  return (
    <Container>
      <TopRow>
        <ButtonsContainer>
          {config.show_dash_version === 'icon_hover' ? (
            <Tooltip placement="right" title={data.dash_version}>
              {ghBtn}
            </Tooltip>
          ) : (
            ghBtn
          )}
        </ButtonsContainer>

        <WidgetControls>
          <WidgetSelect
            inline
            label="Theme"
            value={themeVariant}
            options={THEME_IDS.map((id) => ({
              value: id,
              label: THEME_LABELS[id],
            }))}
            onChange={(value) => setThemeVariant(value as ThemeId)}
          />

          {/* the two fixed themes have no light/dark counterpart, so offering the
            toggle there would suggest a choice that does nothing */}
          {THEME_HAS_BOTH_MODES[themeVariant] ? (
            <WidgetSwitch
              inline
              label="Dark Mode"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          ) : null}
        </WidgetControls>
      </TopRow>

      <Heading>
        {config?.show_host && host ? (
          <>
            <Appendix>dash.</Appendix>
            <ServerName>{host}</ServerName>
          </>
        ) : (
          <StandaloneAppendix>dash.</StandaloneAppendix>
        )}
      </Heading>

      <StyledInfoTable
        $mobile={isMobile}
        infos={toInfoTable(config.os_label_list, {
          os: { label: 'OS', value: os },
          arch: { label: 'Arch', value: arch },
          up_since: { label: 'Up since', value: uptimeStr },
          dash_version: { label: 'Dash Version', value: data.dash_version },
        })}
        page={0}
        itemsPerPage={7}
      />

      <ServerIcon
        os={(override.os ?? distro + platform).toLowerCase()}
        size="2x"
      />
    </Container>
  );
};
