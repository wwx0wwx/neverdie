import { getAgents, upsertAgent, softDeleteAgent } from '../db.js';
import { broadcastUpsert } from '../peers.js';
export async function agentRoutes(app) {
    app.get('/api/agents', async () => {
        return getAgents();
    });
    app.post('/api/agents', async (req, rep) => {
        const { baseUrl, displayName } = req.body;
        if (!baseUrl || typeof baseUrl !== 'string') {
            return rep.status(400).send({ error: 'baseUrl is required' });
        }
        const record = {
            baseUrl: baseUrl.trim(),
            displayName: displayName?.trim() || undefined,
            enabled: true,
            updatedAt: new Date().toISOString(),
        };
        upsertAgent(record);
        void broadcastUpsert(record);
        return record;
    });
    app.delete('/api/agents/:b64', async (req) => {
        const baseUrl = Buffer.from(req.params.b64, 'base64').toString('utf8');
        const updatedAt = new Date().toISOString();
        softDeleteAgent(baseUrl, updatedAt);
        const record = {
            baseUrl,
            enabled: false,
            updatedAt,
            deletedAt: updatedAt,
        };
        void broadcastUpsert(record);
        return { ok: true };
    });
}
//# sourceMappingURL=agents.js.map