import express from 'express';
import { hashPassword, hashToken, newSessionToken, validateCredentials, verifyPassword } from './passwords.js';

export const SESSION_MAX_IDLE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days since last use

const ATTEMPT_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

/**
 * Username + password accounts:
 *   POST /api/auth/register { username, password } → { token, user }
 *   POST /api/auth/login    { username, password } → { token, user }
 *   POST /api/auth/logout   (Authorization: Bearer <token>)
 * The token is then passed in the Socket.io handshake as `sessionToken`.
 */
export function createAuthRouter({ store }) {
  const router = express.Router();
  const attempts = new Map(); // ip → { start, count }

  // Basic brute-force protection per IP for register/login.
  const limited = (req) => {
    const now = Date.now();
    const a = attempts.get(req.ip);
    if (!a || now - a.start > ATTEMPT_WINDOW_MS) {
      attempts.set(req.ip, { start: now, count: 1 });
      return false;
    }
    a.count += 1;
    return a.count > MAX_ATTEMPTS;
  };

  const startSession = async (account) => {
    const token = newSessionToken();
    await store.createSession(hashToken(token), account.username);
    return { token, user: { id: account.id, username: account.username } };
  };

  router.post('/register', async (req, res) => {
    if (limited(req)) return res.status(429).json({ error: 'rate_limited' });
    const check = validateCredentials(req.body?.username, req.body?.password);
    if (!check.ok) return res.status(400).json({ error: check.reason });

    const created = await store.createAccount(check.username, await hashPassword(check.password));
    if (!created.ok) return res.status(409).json({ error: created.reason });
    await store.getOrCreatePlayer({ id: created.account.id, name: created.account.username, avatar: null, isGuest: false });
    res.status(201).json(await startSession(created.account));
  });

  router.post('/login', async (req, res) => {
    if (limited(req)) return res.status(429).json({ error: 'rate_limited' });
    const account = await store.getAccountByUsername(req.body?.username);
    const ok = account && (await verifyPassword(String(req.body?.password || ''), account.passwordHash));
    if (!ok) return res.status(401).json({ error: 'wrong_credentials' });
    res.json(await startSession(account));
  });

  router.post('/logout', async (req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token) await store.deleteSession(hashToken(token));
    res.json({ ok: true });
  });

  return router;
}
