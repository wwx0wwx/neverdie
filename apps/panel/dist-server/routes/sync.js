import { getAllRecords, mergeAgents } from '../db.js';
const PANEL_SECRET = process.env.PANEL_SECRET ?? '';
function checkSecret(req, reply) {
    if (!PANEL_SECRET)
        return true; // not configured — open (dev mode)
    if (req.headers['x-panel-secret'] !== PANEL_SECRET) {
        reply.status(401).send({ error: 'Invalid panel secret' });
        return false;
    }
    return true;
}
export async function syncRoutes(app) {
    // Peer bootstrap: return all records including soft-deleted
    app.get('/api/sync/full', async (req, reply) => {
        if (!checkSecret(req, reply))
            return;
        return { records: getAllRecords() };
    });
    // Receive a single record broadcast from a peer
    app.post('/api/sync/push', async (req, reply) => {
        if (!checkSecret(req, reply))
            return;
        const { record } = req.body;
        if (!record?.baseUrl || !record?.updatedAt) {
            return reply.status(400).send({ error: 'invalid payload' });
        }
        mergeAgents([record]);
        return { ok: true };
    });
}
//# sourceMappingURL=sync.js.map