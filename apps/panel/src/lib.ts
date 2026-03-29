import type {
  AgentConfigRecord,
  AgentControlPlaneRecord,
  AgentIdentity,
  AgentNodeView,
  AgentStatusRecord,
  ApiResponse,
  HardwareMetadata,
  MetricsSnapshot,
  RegionInfo,
} from '@neverdie/protocol';
import { computeSnapshotAgeMs, isSnapshotStale, nowIso } from '@neverdie/shared';

// --- Store API client ---

export async function fetchAgents(): Promise<AgentControlPlaneRecord[]> {
  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const records: AgentConfigRecord[] = await res.json();
  return records.map((r) => ({
    baseUrl: r.baseUrl,
    displayName: r.displayName,
    enabled: r.enabled,
  }));
}

export async function addAgentToStore(baseUrl: string, displayName?: string): Promise<void> {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl, displayName }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function removeAgentFromStore(baseUrl: string): Promise<void> {
  const res = await fetch(`/api/agents/${btoa(baseUrl)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export interface AgentFetchBundle {
  identity?: AgentIdentity;
  hardware?: HardwareMetadata;
  region?: RegionInfo;
  latestStatus?: AgentStatusRecord;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) {
    throw new Error(payload.error);
  }

  return payload.data;
}

export async function pollAgent(baseUrl: string, staleAfterMs: number): Promise<AgentFetchBundle> {
  const normalized = baseUrl.replace(/\/$/, '');
  const [identity, hardware, region, snapshot] = await Promise.all([
    readJson<AgentIdentity>(`${normalized}/identity`),
    readJson<HardwareMetadata>(`${normalized}/hardware`),
    readJson<RegionInfo>(`${normalized}/region`),
    readJson<MetricsSnapshot>(`${normalized}/metrics`),
  ]);

  const receivedAt = nowIso();
  const snapshotAgeMs = computeSnapshotAgeMs(snapshot, receivedAt);

  return {
    identity,
    hardware,
    region,
    latestStatus: {
      polledAt: receivedAt,
      receivedAt,
      snapshot,
      snapshotAgeMs,
      stale: isSnapshotStale(snapshotAgeMs, staleAfterMs),
      agentReachable: true,
    },
  };
}

export function withPollingFailure(node: AgentNodeView, error: unknown): AgentNodeView {
  const message = error instanceof Error ? error.message : 'unknown error';
  return {
    ...node,
    latestStatus: {
      polledAt: nowIso(),
      receivedAt: nowIso(),
      snapshotAgeMs: Number.MAX_SAFE_INTEGER,
      stale: true,
      agentReachable: false,
      error: message,
      snapshot: node.latestStatus?.snapshot ?? {
        timestamp: nowIso(),
        cpuUsagePercent: 0,
        ramUsagePercent: 0,
        diskUsagePercent: null,
        uploadThroughput: { bytesPerSecond: 0 },
        downloadThroughput: { bytesPerSecond: 0 },
        cumulativeTraffic: { uploadedBytes: 0, downloadedBytes: 0 },
      },
    },
  };
}

export function encodeNodeId(baseUrl: string): string {
  return btoa(baseUrl);
}

export function decodeNodeId(value: string): string {
  return atob(value);
}
