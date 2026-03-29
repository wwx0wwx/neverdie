import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto';
const dbPath = process.env.DB_PATH ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'neverdie.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    baseUrl     TEXT PRIMARY KEY,
    displayName TEXT,
    enabled     INTEGER NOT NULL DEFAULT 1,
    updatedAt   TEXT    NOT NULL,
    deletedAt   TEXT
  );

  CREATE TABLE IF NOT EXISTS admins (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS panels (
    id          TEXT PRIMARY KEY,
    displayName TEXT,
    domain      TEXT NOT NULL,
    secret      TEXT NOT NULL,
    joinedAt    TEXT NOT NULL,
    deletedAt   TEXT
  );

  CREATE TABLE IF NOT EXISTS agent_keys (
    agentId     TEXT PRIMARY KEY,
    displayName TEXT,
    secret      TEXT NOT NULL,
    baseUrl     TEXT,
    createdAt   TEXT NOT NULL,
    deletedAt   TEXT
  );
`);
export function getAgents() {
    const stmt = db.prepare('SELECT * FROM agents WHERE deletedAt IS NULL ORDER BY baseUrl');
    return stmt.all().map(rowToRecord);
}
export function getAllRecords() {
    const stmt = db.prepare('SELECT * FROM agents ORDER BY baseUrl');
    return stmt.all().map(rowToRecord);
}
export function upsertAgent(record) {
    const stmt = db.prepare(`
    INSERT INTO agents (baseUrl, displayName, enabled, updatedAt, deletedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(baseUrl) DO UPDATE SET
      displayName = excluded.displayName,
      enabled     = excluded.enabled,
      updatedAt   = excluded.updatedAt,
      deletedAt   = excluded.deletedAt
  `);
    stmt.run(record.baseUrl, record.displayName ?? null, record.enabled ? 1 : 0, record.updatedAt, record.deletedAt ?? null);
}
export function softDeleteAgent(baseUrl, updatedAt) {
    const stmt = db.prepare('UPDATE agents SET deletedAt = ?, updatedAt = ?, enabled = 0 WHERE baseUrl = ?');
    stmt.run(updatedAt, updatedAt, baseUrl);
}
// Merge a batch of records from a peer using LWW
export function mergeAgents(records) {
    const stmt = db.prepare(`
    INSERT INTO agents (baseUrl, displayName, enabled, updatedAt, deletedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(baseUrl) DO UPDATE SET
      displayName = excluded.displayName,
      enabled     = excluded.enabled,
      updatedAt   = excluded.updatedAt,
      deletedAt   = excluded.deletedAt
    WHERE excluded.updatedAt > agents.updatedAt
  `);
    for (const r of records) {
        stmt.run(r.baseUrl, r.displayName ?? null, r.enabled ? 1 : 0, r.updatedAt, r.deletedAt ?? null);
    }
}
function rowToRecord(row) {
    return {
        baseUrl: row.baseUrl,
        displayName: row.displayName ?? undefined,
        enabled: row.enabled === 1,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt ?? undefined,
    };
}
// --- Password helpers ---
export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, (err, derived) => {
            if (err)
                reject(err);
            else
                resolve(`${salt}:${derived.toString('hex')}`);
        });
    });
}
export async function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash)
        return false;
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, (err, derived) => {
            if (err)
                reject(err);
            else {
                try {
                    resolve(timingSafeEqual(derived, Buffer.from(hash, 'hex')));
                }
                catch {
                    resolve(false);
                }
            }
        });
    });
}
// --- Admin functions ---
export function hasAdmin() {
    const row = db.prepare('SELECT 1 FROM admins LIMIT 1').get();
    return row !== undefined;
}
export function createAdmin(username, passwordHash) {
    db.prepare('INSERT INTO admins (username, passwordHash, createdAt) VALUES (?, ?, ?)').run(username, passwordHash, new Date().toISOString());
}
export function getAdmin(username) {
    return db.prepare('SELECT id, username, passwordHash FROM admins WHERE username = ?').get(username);
}
// --- Panel peer functions ---
export function getPanels() {
    return db.prepare('SELECT * FROM panels WHERE deletedAt IS NULL ORDER BY joinedAt').all().map((r) => ({ id: r.id, displayName: r.displayName ?? undefined, domain: r.domain, secret: r.secret, joinedAt: r.joinedAt, deletedAt: r.deletedAt ?? undefined }));
}
export function upsertPanel(record) {
    db.prepare(`
    INSERT INTO panels (id, displayName, domain, secret, joinedAt, deletedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      displayName = excluded.displayName,
      domain = excluded.domain,
      secret = excluded.secret,
      deletedAt = excluded.deletedAt
  `).run(record.id, record.displayName ?? null, record.domain, record.secret, record.joinedAt, record.deletedAt ?? null);
}
export function softDeletePanel(id, deletedAt) {
    db.prepare('UPDATE panels SET deletedAt = ? WHERE id = ?').run(deletedAt, id);
}
// --- Agent key functions ---
export function getAgentKeys() {
    return db.prepare('SELECT * FROM agent_keys WHERE deletedAt IS NULL ORDER BY createdAt').all().map((r) => ({ agentId: r.agentId, displayName: r.displayName ?? undefined, secret: r.secret, baseUrl: r.baseUrl ?? undefined, createdAt: r.createdAt, deletedAt: r.deletedAt ?? undefined }));
}
export function upsertAgentKey(record) {
    db.prepare(`
    INSERT INTO agent_keys (agentId, displayName, secret, baseUrl, createdAt, deletedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(agentId) DO UPDATE SET
      displayName = excluded.displayName,
      baseUrl = excluded.baseUrl,
      deletedAt = excluded.deletedAt
  `).run(record.agentId, record.displayName ?? null, record.secret, record.baseUrl ?? null, record.createdAt, record.deletedAt ?? null);
}
export function softDeleteAgentKey(agentId, deletedAt) {
    db.prepare('UPDATE agent_keys SET deletedAt = ? WHERE agentId = ?').run(deletedAt, agentId);
}
//# sourceMappingURL=db.js.map