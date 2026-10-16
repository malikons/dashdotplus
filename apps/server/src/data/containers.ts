import http from 'node:http';
import type {
  ContainerStat,
  ContainersInfo,
  ContainersLoad,
} from '@dashdot/common';
import * as si from 'systeminformation';
import { CONFIG } from '../config';

// The Docker Engine API is plain HTTP over a unix socket, so we can talk to it
// with the node stdlib instead of pulling in a docker client dependency.
const request = <T>(path: string, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: CONFIG.docker_socket_path,
        path,
        method: 'GET',
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Docker API ${res.statusCode} on ${path}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Docker API timeout on ${path}`));
    });
    req.on('error', reject);
    req.end();
  });

type DockerContainerSummary = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
};

// Only the fields we read - the raw payload is far larger
type DockerStats = {
  cpu_stats?: {
    cpu_usage?: { total_usage?: number };
    system_cpu_usage?: number;
  };
  precpu_stats?: {
    cpu_usage?: { total_usage?: number };
    system_cpu_usage?: number;
  };
  memory_stats?: {
    usage?: number;
    limit?: number;
    stats?: Record<string, number>;
  };
  networks?: Record<string, { rx_bytes?: number; tx_bytes?: number }>;
  blkio_stats?: {
    io_service_bytes_recursive?: { op?: string; value?: number }[];
  };
  pids_stats?: { current?: number };
};

// Docker's stats endpoint samples over a ~1s window per request. On a host with
// many containers, fetching them sequentially would take one second each, so
// they are fetched concurrently and bounded to keep Docker from being flooded.
const STATS_CONCURRENCY = 16;
const STATS_TIMEOUT_MS = 20000;

const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );

  await Promise.all(workers);
  return results;
};

const isExcluded = (name: string, image: string): boolean =>
  CONFIG.containers_exclude.some(
    (filter) =>
      filter.length > 0 && (name.includes(filter) || image.includes(filter)),
  );

const getContainerList = async (): Promise<DockerContainerSummary[]> =>
  request<DockerContainerSummary[]>('/containers/json', 10000);

// A sample with the rate-based fields still missing - those are derived once
// the previous poll is available.
type RawSample = Omit<
  ContainerStat,
  'netRx' | 'netTx' | 'diskRead' | 'diskWrite'
>;

const readStats = async (
  container: DockerContainerSummary,
): Promise<RawSample | null> => {
  try {
    const stats = await request<DockerStats>(
      `/containers/${container.Id}/stats?stream=false`,
      STATS_TIMEOUT_MS,
    );

    const cpuUsage = stats.cpu_stats?.cpu_usage?.total_usage ?? 0;
    const preCpuUsage = stats.precpu_stats?.cpu_usage?.total_usage ?? 0;
    const systemCpu = stats.cpu_stats?.system_cpu_usage ?? 0;
    const preSystemCpu = stats.precpu_stats?.system_cpu_usage ?? 0;

    const cpuDelta = cpuUsage - preCpuUsage;
    const systemDelta = systemCpu - preSystemCpu;

    // Deliberately NOT multiplied by the number of online CPUs (which is what
    // `docker stats` does) - this yields % of total host capacity, so the
    // containers sum up to what the host cpu widget reports.
    const cpu = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;

    // cgroup v2 reports page cache inside `usage`; docker subtracts the
    // inactive file cache to get the working set. cgroup v1 uses the
    // `total_inactive_file` variant instead.
    const memStats = stats.memory_stats?.stats ?? {};
    const inactiveFile =
      memStats.inactive_file ?? memStats.total_inactive_file ?? 0;
    const memUsed = Math.max(
      0,
      (stats.memory_stats?.usage ?? 0) - inactiveFile,
    );
    const memLimit = stats.memory_stats?.limit ?? 0;

    let netRxTotal = 0;
    let netTxTotal = 0;
    for (const net of Object.values(stats.networks ?? {})) {
      netRxTotal += net.rx_bytes ?? 0;
      netTxTotal += net.tx_bytes ?? 0;
    }

    let diskReadTotal = 0;
    let diskWriteTotal = 0;
    for (const entry of stats.blkio_stats?.io_service_bytes_recursive ?? []) {
      if (entry.op === 'read') diskReadTotal += entry.value ?? 0;
      else if (entry.op === 'write') diskWriteTotal += entry.value ?? 0;
    }

    const name = (container.Names?.[0] ?? container.Id).replace(/^\//, '');

    return {
      id: container.Id,
      name,
      image: container.Image,
      state: container.State,
      status: container.Status,
      cpu,
      memUsed,
      memLimit,
      netRxTotal,
      netTxTotal,
      diskReadTotal,
      diskWriteTotal,
      pids: stats.pids_stats?.current ?? 0,
    };
  } catch (e) {
    console.warn(
      `Could not read stats for ${
        container.Names?.[0] ?? container.Id
      }: ${e instanceof Error ? e.message : e}`,
    );
    return null;
  }
};

// Cumulative counters (rx/tx, block io) are converted into rates by diffing
// against the previous poll. Kept out of the returned payload so the frontend
// only ever receives finished values.
type Totals = {
  netRxTotal: number;
  netTxTotal: number;
  diskReadTotal: number;
  diskWriteTotal: number;
  at: number;
};

const previousTotals = new Map<string, Totals>();

// the poll runs every few seconds, so a widget that is enabled but has no
// socket mounted would otherwise log the identical error over and over
let reportedUnavailable = false;

// a collection that is already running is shared instead of duplicated
let inflight: Promise<ContainersLoad> | null = null;

const toRate = (
  current: number,
  previous: number | undefined,
  elapsedMs: number,
): number => {
  if (previous === undefined || elapsedMs <= 0 || current < previous) {
    // first sample, or the counter reset because the container restarted
    return 0;
  }
  return (current - previous) / (elapsedMs / 1000);
};

export default {
  static: async (ramSizeFallback = 0): Promise<ContainersInfo> => {
    let available = false;
    try {
      await getContainerList();
      available = true;
    } catch (e) {
      console.warn(
        `Containers widget: cannot reach the docker socket at ${
          CONFIG.docker_socket_path
        } (${e instanceof Error ? e.message : e}). Mount it into the container to enable per-container stats.`,
      );
    }

    let hostRam = CONFIG.override.ram_size ?? ramSizeFallback;
    if (!hostRam) {
      hostRam = (await si.mem()).total;
    }

    return { available, hostRam };
  },
  dynamic: (): Promise<ContainersLoad> => {
    // Overlapping collections corrupt the rates, so they are coalesced here.
    // The background poll uses `mergeMap`, which does not wait for the running
    // collection before starting the next one, and a `/load/containers`
    // request can also collect while the poll is mid-flight. Each collection
    // stamps its result with its own *end* time, but the counters were read
    // earlier - so two overlapping runs end up with their stamps and their
    // counter reads out of step. The next rate then divides a wide real
    // interval by a narrow stamp-to-stamp one and reports a spike.
    // Sharing a single in-flight collection removes the overlap entirely (and
    // does half the work whenever a request lands on an already running poll).
    if (!inflight) {
      inflight = (async () => {
        try {
          const containers = (await getContainerList()).filter(
            (c) =>
              c.State === 'running' &&
              !isExcluded(c.Names?.[0]?.replace(/^\//, '') ?? '', c.Image),
          );

          const samples = await mapLimit(
            containers,
            STATS_CONCURRENCY,
            readStats,
          );

          const now = Date.now();
          const freshTotals = new Map<string, Totals>();
          const result: ContainerStat[] = [];

          for (const stat of samples) {
            if (!stat) continue;

            const prev = previousTotals.get(stat.id);
            const elapsedMs = prev ? now - prev.at : 0;

            result.push({
              ...stat,
              netRx: toRate(stat.netRxTotal, prev?.netRxTotal, elapsedMs),
              netTx: toRate(stat.netTxTotal, prev?.netTxTotal, elapsedMs),
              diskRead: toRate(
                stat.diskReadTotal,
                prev?.diskReadTotal,
                elapsedMs,
              ),
              diskWrite: toRate(
                stat.diskWriteTotal,
                prev?.diskWriteTotal,
                elapsedMs,
              ),
            });

            freshTotals.set(stat.id, {
              netRxTotal: stat.netRxTotal,
              netTxTotal: stat.netTxTotal,
              diskReadTotal: stat.diskReadTotal,
              diskWriteTotal: stat.diskWriteTotal,
              at: now,
            });
          }

          // replace wholesale so containers that went away stop contributing
          previousTotals.clear();
          for (const [id, value] of freshTotals) previousTotals.set(id, value);

          // alphabetical rather than by usage: the list is re-read every poll and
          // re-sorting by cpu would reshuffle the chart grid every few seconds
          result.sort((a, b) => a.name.localeCompare(b.name));

          if (reportedUnavailable) {
            console.info('Containers widget: docker socket reachable again.');
            reportedUnavailable = false;
          }

          return { available: true, containers: result };
        } catch (e) {
          if (!reportedUnavailable) {
            console.warn(
              `Containers widget: ${
                e instanceof Error ? e.message : e
              } (logged once until it recovers)`,
            );
            reportedUnavailable = true;
          }
          // never throw: an error would terminate the stats stream for good
          return { available: false, containers: [] };
        }
      })().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  },
};
