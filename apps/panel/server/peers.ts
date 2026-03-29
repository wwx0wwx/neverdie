import { mergeAgents } from './db.js';
import type { AgentConfigRecord, SyncPushPayload } from '@neverdie/protocol';

function getPeers(): string[] {
  const raw = process.env.PANEL_PEERS ?? '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function broadcastUpsert(record: AgentConfigRecord): Promise<void> {
  const peers = getPeers();
  const payload: SyncPushPayload = { record };
  await Promise.allSettled(
    peers.map((peer) =>
      fetch(`${peer}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PANEL_SECRET ? { 'x-panel-secret': process.env.PANEL_SECRET } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      }).catch(() => undefined),
    ),
  );
}

export async function bootstrapFromPeers(): Promise<void> {
  const peers = getPeers();
  if (peers.length === 0) return;

  for (const peer of peers) {
    try {
      const res = await fetch(`${peer}/api/sync/full`, {
        headers: process.env.PANEL_SECRET ? { 'x-panel-secret': process.env.PANEL_SECRET } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { records: AgentConfigRecord[] };
      if (Array.isArray(body.records)) {
        mergeAgents(body.records);
        console.log(`[peers] bootstrapped from ${peer} (${body.records.length} records)`);
        return;
      }
    } catch {
      // peer unreachable, try next
    }
  }
  console.log('[peers] no peers reachable for bootstrap, starting with local state');
}
