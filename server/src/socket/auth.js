import { hashToken } from '../auth/passwords.js';
import { SESSION_MAX_IDLE_MS } from '../auth/routes.js';
import { hasProfanity } from '../moderation/profanity.js';

const GUEST_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const GUEST_SECRET_RE = /^[A-Za-z0-9_-]{32,128}$/; // random, base64url
// A preset id ("lisica") or an image uploaded to this server.
export const AVATAR_RE = /^([a-z]{2,32}|\/api\/avatars\/[a-f0-9]{40}\.(webp|png|jpg)(\?v=\d+)?)$/;

// Guest nicknames: offensive ones fall back to "Gost-xxxx" (the client adopts the server's name).
function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return name.length >= 2 && !hasProfanity(name) ? name : null;
}

/**
 * Socket.io middleware. Resolves `socket.data.player` from the handshake:
 *   { sessionToken }                                → account (username + password login)
 *   { guestId, guestSecret, guestName, avatar }     → guest (both kept in localStorage)
 *
 * A guest's id is public (others see it in rankings, chat and friend lists); the
 * secret never leaves that browser. The server stores only a hash of it, bound to
 * the id on first use, so knowing someone's id is not enough to play as them.
 */
export function createAuthMiddleware({ store }) {
  return async function authMiddleware(socket, next) {
    try {
      const { sessionToken, guestId, guestSecret, guestName, avatar } = socket.handshake.auth || {};

      if (sessionToken) {
        const account = await store.getSessionAccount(hashToken(sessionToken), SESSION_MAX_IDLE_MS);
        if (!account) return next(new Error('invalid_session'));
        const record = await store.getPlayer(account.id);
        socket.data.player = { id: account.id, name: account.username, avatar: record?.avatar ?? null, isGuest: false };
        return next();
      }

      if (!GUEST_ID_RE.test(guestId || '')) return next(new Error('missing_identity'));
      if (!GUEST_SECRET_RE.test(guestSecret || '')) return next(new Error('missing_guest_secret'));
      const verdict = await store.verifyGuest(`guest:${guestId}`, hashToken(guestSecret));
      if (verdict === 'mismatch') return next(new Error('guest_taken'));
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
