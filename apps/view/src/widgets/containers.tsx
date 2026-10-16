import type {
  Config,
  ContainerMetric,
  ContainerStat,
  ContainersInfo,
  ContainersLoad,
} from '@dashdotplus/common';
import { faDocker } from '@fortawesome/free-brands-svg-icons';
import { Segmented } from 'antd';
import type { Variants } from 'framer-motion';
import { type FC, useMemo, useState } from 'react';
import { YAxis } from 'recharts';
import styled, { useTheme } from 'styled-components';
import { DefaultAreaChart } from '../components/chart-components';
import {
  ChartContainer,
  MultiChartContainer,
} from '../components/chart-container';
import { HardwareInfoContainer } from '../components/hardware-info-container';
import { ThemedText } from '../components/text';
import { useIsMobile } from '../services/mobile';
import { useSetting } from '../services/settings';
import { bytePrettyPrint } from '../utils/calculations';
import type { InfoTableArr } from '../utils/format';
import type { ChartVal } from '../utils/types';

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const ratePrettyPrint = (bytes: number): string =>
  `${bytePrettyPrint(bytes)}/s`;

type MetricDef = {
  label: string;
  value: (container: ContainerStat) => number;
  // compact enough to sit inside a small chart header
  format: (value: number) => string;
  // longer, lives in the info-table tooltip
  detail: (container: ContainerStat, hostRam: number) => string;
};

const percentOf = (part: number, whole: number): string =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)} %` : '/';

const METRICS: Record<ContainerMetric, MetricDef> = {
  cpu: {
    label: 'CPU',
    value: (container) => container.cpu,
    format: (value) => `${value.toFixed(1)} %`,
    detail: (container) =>
      `${container.cpu.toFixed(1)} % of host · ${container.pids} processes`,
  },
  mem: {
    label: 'Memory',
    value: (container) => container.memUsed,
    format: (value) => bytePrettyPrint(value),
    detail: (container, hostRam) =>
      `${bytePrettyPrint(container.memUsed)} · ${percentOf(
        container.memUsed,
        hostRam,
      )} of host${
        container.memLimit
          ? ` · ${percentOf(container.memUsed, container.memLimit)} of limit`
          : ''
      }`,
  },
  net: {
    label: 'Network',
    value: (container) => container.netRx + container.netTx,
    format: (value) => ratePrettyPrint(value),
    detail: (container) =>
      `↓ ${ratePrettyPrint(container.netRx)} · ↑ ${ratePrettyPrint(
        container.netTx,
      )} · Σ ${bytePrettyPrint(container.netRxTotal + container.netTxTotal)}`,
  },
  disk: {
    label: 'Disk I/O',
    value: (container) => container.diskRead + container.diskWrite,
    format: (value) => ratePrettyPrint(value),
    detail: (container) =>
      `read ${ratePrettyPrint(container.diskRead)} · write ${ratePrettyPrint(
        container.diskWrite,
      )} · Σ ${bytePrettyPrint(
        container.diskReadTotal + container.diskWriteTotal,
      )}`,
  },
};

const edgesFor = (
  index: number,
  count: number,
  columns: number,
): [boolean, boolean, boolean, boolean] | undefined => {
  if (columns <= 1) return undefined;

  const row = Math.floor(index / columns);
  const col = index % columns;
  const lastRowStart = Math.floor((count - 1) / columns) * columns;

  return [row === 0, col === columns - 1, index >= lastRowStart, col === 0];
};

const ExtraContainer = styled.div`
  position: absolute;
  right: 25px;
  top: 25px;
  z-index: 2;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const SummaryText = styled(ThemedText)`
  font-size: 0.8rem;
  opacity: 0.75;
`;

const Message = styled(ThemedText)`
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 30px;
  opacity: 0.75;
`;

type ContainersWidgetProps = {
  load: ContainersLoad[];
  data: ContainersInfo;
  config: Config;
};

export const ContainersWidget: FC<ContainersWidgetProps> = ({
  load,
  data,
  config,
}) => {
  const theme = useTheme();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(0);
  const [metric, setMetric] = useSetting(
    'containersMetric',
    config.containers_default_metric,
  );

  const itemsPerPage = config.containers_widget_items_per_page;
  // a stale localStorage value must never be able to blank the widget
  const definition = METRICS[metric] ?? METRICS.cpu;

  const latest = load.at(-1);
  const available = latest?.available ?? data.available;
  const containers = latest?.containers ?? [];
  const hasSamples = load.length > 0;

  // NOTE: `page` here must stay identical to the page the info table is
  // rendering with - HardwareInfoContainer owns that state and reports every
  // change through onPageChange, so both slices stay in lockstep.
  const startIndex = page * itemsPerPage;
  const shown = containers.slice(startIndex, startIndex + itemsPerPage);

  // one series per container, built from the snapshots we have accumulated
  const seriesByContainer = useMemo(() => {
    const map = new Map<string, ChartVal[]>();
    for (const snapshot of load) {
      for (const container of snapshot.containers) {
        let series = map.get(container.id);
        if (!series) {
          series = [];
          map.set(container.id, series);
        }
        series.push({ x: series.length, y: METRICS[metric].value(container) });
      }
    }
    return map;
  }, [load, metric]);

  const infos: InfoTableArr = available
    ? containers.map((container) => ({
        label: truncate(container.name, 26),
        value: definition.format(definition.value(container)),
        tooltip: `${container.name} · ${container.image} · ${container.status} · ${definition.detail(
          container,
          data.hostRam,
        )}`,
      }))
    : [
        {
          label: 'Docker',
          value: 'not available',
          tooltip:
            'The docker socket could not be reached. Mount it into the dashdot container to enable per-container stats.',
        },
      ];

  const runningCount = containers.length;
  const totalCpu = containers.reduce((acc, c) => acc + c.cpu, 0);
  const totalMem = containers.reduce((acc, c) => acc + c.memUsed, 0);
  // kept deliberately short: it sits at the top-right of the widget and must
  // never run into the info column / paging arrows
  const summary = `${runningCount} running · ${totalCpu.toFixed(
    1,
  )} % CPU · ${bytePrettyPrint(totalMem)} mem`;

  // never render more columns than there are items on this page, otherwise the
  // grid leaves an empty cell (a page with a single container would only fill
  // half the widget)
  const columns = isMobile ? 1 : Math.max(1, Math.min(shown.length, 2));

  let content: React.ReactNode;
  if (!available) {
    content = <Message>Docker socket not reachable.</Message>;
  } else if (!hasSamples) {
    content = <Message>Waiting for container stats…</Message>;
  } else if (containers.length === 0) {
    content = <Message>No running containers.</Message>;
  } else if (shown.length === 0) {
    // the container list shrank underneath the current page
    content = <Message>No containers on this page.</Message>;
  } else {
    content = (
      <MultiChartContainer
        columns={columns}
        gap={8}
        layout
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {shown.map((container, index) => {
          const series = seriesByContainer.get(container.id) ?? [];
          const maxValue = series.reduce(
            (acc, point) => Math.max(acc, (point.y as number) ?? 0),
            0,
          );

          return (
            <ChartContainer
              key={container.id}
              variants={itemVariants}
              contentLoaded={series.length > 1}
              edges={edgesFor(index, shown.length, columns)}
              textLeft={truncate(container.name, 14)}
              textRight={definition.format(definition.value(container))}
              textSize="0.75rem"
              renderChart={(size) => (
                <DefaultAreaChart
                  data={series}
                  height={size.height}
                  width={size.width}
                  color={theme.colors.containersPrimary}
                  renderTooltip={(val) =>
                    definition.format((val.payload?.[0]?.value as number) ?? 0)
                  }
                >
                  <YAxis
                    hide={true}
                    type="number"
                    domain={[0, maxValue * 1.2 || 1]}
                  />
                </DefaultAreaChart>
              )}
            />
          );
        })}
      </MultiChartContainer>
    );
  }

  return (
    <HardwareInfoContainer
      color={theme.colors.containersPrimary}
      heading="Containers"
      infos={infos}
      infosPerPage={itemsPerPage}
      icon={faDocker}
      extraContent={
        available && containers.length > 0 ? (
          <ExtraContainer>
            <Segmented
              size="small"
              value={metric}
              onChange={(value) => setMetric(value as ContainerMetric)}
              options={[
                { label: 'CPU', value: 'cpu' },
                { label: 'Memory', value: 'mem' },
                { label: 'Network', value: 'net' },
                { label: 'Disk I/O', value: 'disk' },
              ]}
            />
            <SummaryText>{summary}</SummaryText>
          </ExtraContainer>
        ) : undefined
      }
      onPageChange={setPage}
    >
      {content}
    </HardwareInfoContainer>
  );
};
