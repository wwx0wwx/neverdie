import { mergeAgents } from './db.js';
function getPeers() {
    const raw = process.env.PANEL_PEERS ?? '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
export async function broadcastUpsert(record) {
    const peers = getPeers();
    const payload = { record };
    await Promise.allSettled(peers.map((peer) => fetch(`${peer}/api/sync/push`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(process.env.PANEL_SECRET ? { 'x-panel-secret': process.env.PANEL_SECRET } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
    }).catch(() => undefined)));
}
export async function bootstrapFromPeers() {
    const peers = getPeers();
    if (peers.length === 0)
        return;
    for (const peer of peers) {
        try {
            const res = await fetch(`${peer}/api/sync/full`, {
                headers: process.env.PANEL_SECRET ? { 'x-panel-secret': process.env.PANEL_SECRET } : {},
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok)
                continue;
            const body = (await res.json());
            if (Array.isArray(body.records)) {
                mergeAgents(body.records);
                console.log(`[peers] bootstrapped from ${peer} (${body.records.length} records)`);
                return;
            }
        }
        catch {
            // peer unreachable, try next
        }
    }
    console.log('[peers] no peers reachable for bootstrap, starting with local state');
}
//# sourceMappingURL=peers.js.map