import { hashToken } from '../auth/passwords.js';
import { SESSION_MAX_IDLE_MS } from '../auth/routes.js';

const GUEST_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
// A preset id ("lisica") or an image uploaded to this server.
export const AVATAR_RE = /^([a-z]{2,32}|\/api\/avatars\/[a-f0-9]{40}\.(webp|png|jpg)(\?v=\d+)?)$/;

function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return name.length >= 2 ? name : null;
}

/**
 * Socket.io middleware. Resolves `socket.data.player` from the handshake:
 *   { sessionToken }                   → account (username + password login)
 *   { guestId, guestName, avatar }     → guest (stable id stored in localStorage)
 */
export function createAuthMiddleware({ store }) {
  return async function authMiddleware(socket, next) {
    try {
      const { sessionToken, guestId, guestName, avatar } = socket.handshake.auth || {};

      if (sessionToken) {
        const account = await store.getSessionAccount(hashToken(sessionToken), SESSION_MAX_IDLE_MS);
        if (!account) return next(new Error('invalid_session'));
        const record = await store.getPlayer(account.id);
        socket.data.player = { id: account.id, name: account.username, avatar: record?.avatar ?? null, isGuest: false };
        return next();
      }

      if (!GUEST_ID_RE.test(guestId || '')) return next(new Error('missing_identity'));
      socket.data.player = {
        id: `guest:${guestId}`,
        name: cleanName(guestName) || `Gost-${guestId.slice(0, 4)}`,
        avatar: AVATAR_RE.test(avatar || '') ? avatar : null,
        isGuest: true,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}
