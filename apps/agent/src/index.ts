import os from 'node:os';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import si from 'systeminformation';
import type {
  AgentIdentity,
  HardwareMetadata,
  MetricsSnapshot,
  RegionInfo,
} from '@neverdie/protocol';
import { clampPercent, toApiSuccess } from '@neverdie/shared';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
const startedAt = new Date().toISOString();
const port = Number(process.env.AGENT_PORT ?? 43110);
const staleAfterMs = Number(process.env.STALE_AFTER_MS ?? 15000);
const networkMode = (process.env.NETWORK_MODE ?? 'single') as 'single' | 'aggregated';
const primaryInterface = process.env.PRIMARY_INTERFACE ?? '';

const identity: AgentIdentity = {
  agentId: os.hostname(),
  name: process.env.AGENT_NAME ?? os.hostname(),
  version: '0.1.0',
  startedAt,
};

function resolveRegion(): RegionInfo {
  const regionCode = process.env.AGENT_REGION_CODE ?? 'local';
  const regionName = process.env.AGENT_REGION_NAME ?? 'Local';
  const city = process.env.AGENT_CITY || undefined;
  const country = process.env.AGENT_COUNTRY || undefined;

  return {
    provider: 'local',
    regionCode,
    regionName,
    city,
    country,
    source: process.env.AGENT_REGION_CODE || process.env.AGENT_REGION_NAME ? 'env' : 'default',
  };
}

async function getHardware(): Promise<HardwareMetadata> {
  const [cpu, mem, fsSize, networkInterfaces] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.fsSize(),
    si.networkInterfaces(),
  ]);

  const primaryDisk = fsSize[0]
    ? {
        filesystem: fsSize[0].fs,
        mount: fsSize[0].mount,
        totalBytes: fsSize[0].size,
      }
    : undefined;

  const ifaces = Array.isArray(networkInterfaces) ? networkInterfaces : [networkInterfaces];

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: {
      model: cpu.brand,
      cores: cpu.cores,
    },
    memory: {
      totalBytes: mem.total,
    },
    primaryDisk,
    networkInterfaces: ifaces.map((item) => ({
      name: item.iface,
      addresses: [item.ip4, item.ip6].filter((value): value is string => Boolean(value)),
      mac: item.mac || undefined,
    })),
  };
}

async function getSnapshot(): Promise<MetricsSnapshot> {
  const [currentLoad, mem, fsSize, networkStats] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
  ]);

  const diskUsagePercent =
    fsSize[0] && fsSize[0].size > 0
      ? clampPercent((fsSize[0].use / fsSize[0].size) * 100)
      : null;

  const stats = Array.isArray(networkStats) ? networkStats : [networkStats];
  const nonLoopback = stats.filter((n) => n.iface !== 'lo' && !n.iface.startsWith('lo'));

  let uploadBps = 0;
  let downloadBps = 0;
  let uploadedBytes = 0;
  let downloadedBytes = 0;

  if (networkMode === 'aggregated') {
    for (const n of nonLoopback) {
      uploadBps += n.tx_sec ?? 0;
      downloadBps += n.rx_sec ?? 0;
      uploadedBytes += n.tx_bytes ?? 0;
      downloadedBytes += n.rx_bytes ?? 0;
    }
  } else {
    const target = primaryInterface
      ? (nonLoopback.find((n) => n.iface === primaryInterface) ?? nonLoopback[0])
      : nonLoopback[0];
    uploadBps = target?.tx_sec ?? 0;
    downloadBps = target?.rx_sec ?? 0;
    uploadedBytes = target?.tx_bytes ?? 0;
    downloadedBytes = target?.rx_bytes ?? 0;
  }

  return {
    timestamp: new Date().toISOString(),
    cpuUsagePercent: clampPercent(currentLoad.currentLoad),
    ramUsagePercent: clampPercent(((mem.total - mem.available) / mem.total) * 100),
    diskUsagePercent,
    uploadThroughput: { bytesPerSecond: Math.max(0, uploadBps) },
    downloadThroughput: { bytesPerSecond: Math.max(0, downloadBps) },
    cumulativeTraffic: { uploadedBytes, downloadedBytes },
  };
}

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? true,
});

app.get('/health', async () => {
  return toApiSuccess({ status: 'ok', staleAfterMs, uptime: process.uptime() });
});

app.get('/identity', async () => {
  return toApiSuccess(identity);
});

app.get('/hardware', async () => {
  const hardware = await getHardware();
  return toApiSuccess(hardware);
});

app.get('/region', async () => {
  return toApiSuccess(resolveRegion());
});

app.get('/metrics', async () => {
  const snapshot = await getSnapshot();
  return toApiSuccess(snapshot);
});

app.get('/status', async () => {
  return toApiSuccess({
    uptime: process.uptime(),
    startedAt,
    nodeVersion: process.version,
    platform: os.platform(),
    networkMode,
    primaryInterface: primaryInterface || null,
    staleAfterMs,
  });
});

app.get('/v1/agent/summary', async () => {
  const [hardware, snapshot] = await Promise.all([getHardware(), getSnapshot()]);

  return toApiSuccess({
    identity,
    region: resolveRegion(),
    hardware,
    snapshot,
    staleAfterMs,
  });
});

try {
  await app.listen({ host: '0.0.0.0', port });
  app.log.info(`neverdie agent listening on http://127.0.0.1:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
