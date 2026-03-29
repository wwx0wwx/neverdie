import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { agentRoutes } from './routes/agents.js';
import { syncRoutes } from './routes/sync.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { bootstrapFromPeers } from './peers.js';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PANEL_API_PORT ?? 41731);
const isDev = process.env.NODE_ENV !== 'production';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

await app.register(cors, {
  origin: isDev ? true : (process.env.PANEL_ORIGIN ?? false),
  credentials: true,
});

await app.register(fastifyCookie);
await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod',
  cookie: { cookieName: 'token', signed: false },
});

// Decorate authenticate hook for protected routes
app.decorate('authenticate', async function (req: any, rep: any) {
  try {
    await req.jwtVerify();
  } catch {
    rep.status(401).send({ error: 'Unauthorized' });
  }
});

// Serve built frontend in production
if (!isDev) {
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    await app.register(staticPlugin, {
      root: distPath,
      prefix: '/',
    });
    // SPA fallback
    app.setNotFoundHandler((_req, reply) => {
      void reply.sendFile('index.html');
    });
  }
}

await app.register(authRoutes);
await app.register(adminRoutes);
await app.register(agentRoutes);
await app.register(syncRoutes);

// Bootstrap config from peers before accepting requests
await bootstrapFromPeers();

try {
  await app.listen({ host: '0.0.0.0', port });
  app.log.info(`neverdie panel server listening on http://127.0.0.1:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
