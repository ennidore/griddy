import { playerRoom } from '../services/progression.js';
import { publicPlayer } from '../store/JsonStore.js';

const MAX_DM_LENGTH = 500;
const DM_MIN_INTERVAL_MS = 400;

const isOnline = (io, id) => (io.sockets.adapter.rooms.get(playerRoom(id))?.size ?? 0) > 0;

/** Tell a player's accepted friends to refetch (e.g. presence changed). */
export async function notifyFriends(io, store, id) {
  const links = await store.listFriendships(id);
  for (const l of links) if (l.status === 'accepted') io.to(playerRoom(l.otherId)).emit('friends:changed');
}

async function buildFriendList(io, store, id) {
  const links = await store.listFriendships(id);
  const players = new Map((await store.getPlayers(links.map((l) => l.otherId))).map((p) => [p.id, p]));
  const summaries = await store.conversationSummaries(id);

  const result = { friends: [], incoming: [], outgoing: [] };
  for (const l of links) {
    const p = players.get(l.otherId);
    if (!p) continue;
    const base = publicPlayer(p);
    if (l.status === 'accepted') {
      const s = summaries[p.id];
      result.friends.push({ ...base, online: isOnline(io, p.id), unread: s?.unread ?? 0, lastMessage: s?.last ?? null });
    } else {
      result[l.status].push(base);
    }
  }
  // Online first, then most recent conversation.
  result.friends.sort(
    (a, b) => b.online - a.online || (b.lastMessage?.at ?? 0) - (a.lastMessage?.at ?? 0) || a.name.localeCompare(b.name),
  );
  return result;
}

export function registerSocialHandlers(io, socket, { store }) {
  const me = () => socket.data.player.id;
  const changed = (...ids) => ids.forEach((id) => io.to(playerRoom(id)).emit('friends:changed'));
  const reply = (ack, value) => typeof ack === 'function' && ack(value);
  let lastDmAt = 0;

  socket.on('friends:list', async (ack) => reply(ack, await buildFriendList(io, store, me())));

  socket.on('friends:search', async (payload, ack) => {
    const results = await store.searchPlayers(payload?.query, me());
    const links = new Map((await store.listFriendships(me())).map((l) => [l.otherId, l.status]));
    reply(ack, { ok: true, results: results.map((p) => ({ ...p, relation: links.get(p.id) || null })) });
  });

  socket.on('friends:request', async (payload, ack) => {
    const target = payload?.code
      ? await store.findByFriendCode(payload.code)
      : await store.getPlayer(String(payload?.playerId || ''));
    if (!target) return reply(ack, { ok: false, reason: 'not_found' });
    if (target.id === me()) return reply(ack, { ok: false, reason: 'self' });

    const res = await store.requestFriend(me(), target.id);
    if (res.ok) changed(me(), target.id);
    reply(ack, { ...res, name: target.name });
  });

  socket.on('friends:respond', async (payload, ack) => {
    const res = await store.respondFriend(me(), String(payload?.playerId || ''), Boolean(payload?.accept));
    if (res.ok) changed(me(), payload.playerId);
    reply(ack, res);
  });

  socket.on('friends:remove', async (payload, ack) => {
    const other = String(payload?.playerId || '');
    const res = await store.removeFriend(me(), other);
    changed(me(), other);
    reply(ack, res);
  });

  socket.on('dm:history', async (payload, ack) => {
    const other = String(payload?.playerId || '');
    const f = await store.getFriendship(me(), other);
    if (f?.status !== 'accepted') return reply(ack, { ok: false, reason: 'not_friends', messages: [] });
    const messages = await store.getConversation(me(), other);
    await store.markRead(me(), other);
    reply(ack, { ok: true, messages });
  });

  socket.on('dm:read', async (payload) => {
    if (payload?.playerId) await store.markRead(me(), String(payload.playerId));
  });

  socket.on('dm:send', async (payload, ack) => {
    const to = String(payload?.to || '');
    const text = String(payload?.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_DM_LENGTH);
    if (!text) return reply(ack, { ok: false, reason: 'empty' });

    const now = Date.now();
    if (now - lastDmAt < DM_MIN_INTERVAL_MS) return reply(ack, { ok: false, reason: 'rate_limited' });
    lastDmAt = now;

    const f = await store.getFriendship(me(), to);
    if (f?.status !== 'accepted') return reply(ack, { ok: false, reason: 'not_friends' });

    const msg = await store.addMessage(me(), to, text);
    io.to(playerRoom(me())).to(playerRoom(to)).emit('dm:message', msg);
    reply(ack, { ok: true, message: msg });
  });
}
