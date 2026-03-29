import type { AgentControlPlaneRecord, AgentStatusRecord, ApiResponse, MetricsSnapshot } from '@neverdie/protocol';

export function nowIso(): string {
  return new Date().toISOString();
}

export function toApiSuccess<T>(data: T): ApiResponse<T> {
  return {
    ok: true,
    data,
    servedAt: nowIso(),
  };
}

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

export function computeSnapshotAgeMs(snapshot: MetricsSnapshot, receivedAtIso: string): number {
  return Math.max(0, Date.parse(receivedAtIso) - Date.parse(snapshot.timestamp));
}

export function isSnapshotStale(snapshotAgeMs: number, staleAfterMs: number): boolean {
  return snapshotAgeMs > staleAfterMs;
}

export function buildAgentRecord(baseUrl: string, displayName?: string): AgentControlPlaneRecord {
  return {
    baseUrl,
    enabled: true,
    displayName,
  };
}

export function sortAgents(records: AgentControlPlaneRecord[]): AgentControlPlaneRecord[] {
  return [...records].sort((a, b) => a.baseUrl.localeCompare(b.baseUrl));
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export function formatAge(ms: number): string {
  if (ms < 1_000) {
    return `${ms} ms`;
  }

  const seconds = Math.floor(ms / 1_000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${remainSeconds}s`;
}

export function summarizeStatus(status?: AgentStatusRecord): string {
  if (!status) {
    return '尚未轮询';
  }

  if (!status.agentReachable) {
    return status.error ? `不可达：${status.error}` : '不可达';
  }

  return status.stale ? `已过期（${formatAge(status.snapshotAgeMs)}）` : `最新（${formatAge(status.snapshotAgeMs)}）`;
}
