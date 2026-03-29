import type { FastifyInstance } from 'fastify';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  getPanels, upsertPanel, softDeletePanel,
  getAgentKeys, upsertAgentKey, softDeleteAgentKey,
} from '../db.js';
import type { PanelRecord, AgentKeyRecord } from '@neverdie/protocol';

const PANEL_DOMAIN = process.env.PANEL_DOMAIN ?? '';

export async function adminRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] };

  // --- Panel peers ---

  app.get('/api/admin/panels', auth, async () => {
    return getPanels();
  });

  app.post<{ Body: { displayName?: string } }>('/api/admin/panels', auth, async (req) => {
    const id = randomUUID();
    const secret = randomBytes(32).toString('hex');
    const record: PanelRecord = {
      id,
      displayName: req.body.displayName?.trim() || undefined,
      domain: PANEL_DOMAIN,
      secret,
      joinedAt: new Date().toISOString(),
    };
    upsertPanel(record);
    const installCmd = `bash <(curl -fsSL https://${PANEL_DOMAIN}/install.sh) --panel-id ${id} --panel-secret ${secret} --bootstrap https://${PANEL_DOMAIN}`;
    return { record, installCmd };
  });

  app.delete<{ Params: { id: string } }>('/api/admin/panels/:id', auth, async (req) => {
    softDeletePanel(req.params.id, new Date().toISOString());
    return { ok: true };
  });

  // --- Agent keys ---

  app.get('/api/admin/agent-keys', auth, async () => {
    return getAgentKeys();
  });

  app.post<{ Body: { displayName?: string } }>('/api/admin/agent-keys', auth, async (req) => {
    const agentId = randomUUID();
    const secret = randomBytes(32).toString('hex');
    const record: AgentKeyRecord = {
      agentId,
      displayName: req.body.displayName?.trim() || undefined,
      secret,
      createdAt: new Date().toISOString(),
    };
    upsertAgentKey(record);
    const installCmd = `bash <(curl -fsSL https://${PANEL_DOMAIN}/install-agent.sh) --agent-id ${agentId} --agent-secret ${secret} --panel https://${PANEL_DOMAIN}`;
    return { record, installCmd };
  });

  app.delete<{ Params: { agentId: string } }>('/api/admin/agent-keys/:agentId', auth, async (req) => {
    softDeleteAgentKey(req.params.agentId, new Date().toISOString());
    return { ok: true };
  });
}
