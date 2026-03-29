import type { FastifyInstance } from 'fastify';
import { hasAdmin, createAdmin, getAdmin, hashPassword, verifyPassword } from '../db.js';

export async function authRoutes(app: FastifyInstance) {
  // Check if setup is needed
  app.get('/api/auth/status', async () => {
    return { needsSetup: !hasAdmin() };
  });

  // Initial setup — create first admin
  app.post<{ Body: { username: string; password: string } }>('/api/auth/setup', async (req, rep) => {
    if (hasAdmin()) {
      return rep.status(409).send({ error: 'Admin already exists' });
    }
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) {
      return rep.status(400).send({ error: 'username and password (min 8 chars) required' });
    }
    const passwordHash = await hashPassword(password);
    createAdmin(username.trim(), passwordHash);
    const token = app.jwt.sign({ username: username.trim() }, { expiresIn: '7d' });
    rep.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    return { ok: true };
  });

  // Login
  app.post<{ Body: { username: string; password: string } }>('/api/auth/login', async (req, rep) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return rep.status(400).send({ error: 'username and password required' });
    }
    const admin = getAdmin(username.trim());
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return rep.status(401).send({ error: 'Invalid credentials' });
    }
    const token = app.jwt.sign({ username: admin.username }, { expiresIn: '7d' });
    rep.setCookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    return { ok: true };
  });

  // Logout
  app.post('/api/auth/logout', async (_req, rep) => {
    rep.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  // Whoami
  app.get('/api/auth/me', { onRequest: [app.authenticate] }, async (req) => {
    return { username: (req.user as any).username };
  });
}
