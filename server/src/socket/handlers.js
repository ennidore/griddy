import { randomUUID } from 'node:crypto';
import { playerRoom } from '../services/progression.js';
import { GAME_ROOM } from '../game/RoundManager.js';
import { serializePlayer } from '../store/JsonStore.js';
import { TILE_SKINS } from '../shop/catalog.js';
import { COIN_RULES } from '../progression/levels.js';
import { registerSocialHandlers, notifyFriends } from './social.js';
import { registerShopHandlers } from './shop.js';
import { registerProfileHandlers } from './profile.js';

/**
 * Socket event contract (see README for payloads)
 *
 * server → client
 *   sync              { state, you, chat, online, player, catalog }   on connect
 *   round:state       publicState                                     every phase change
 *   round:scores      { roundId, top[] }                              throttled live scores
 *   player:update     { player, rewards? }                            account changed
 *   chat:message      round chat line
 *   presence          { online, playing }
 *   friends:changed   ()                                              refetch friends list
 *   dm:message        { id, from, to, text, at }
 *
 * client → server (with ack)
 *   time:ping · game:join { now } · game:leave · word:submit { roundId, path }
 *   chat:send { text } · profile:update { name?, avatar? } (accounts)
 *   shop:buy { itemId } · shop:equip { itemId }
 *   friends:list · friends:request { code | playerId } · friends:respond { playerId, accept }
 *   friends:remove { playerId } · dm:history { playerId } · dm:send { to, text } · dm:read { playerId }
 *   friends:search { query } · profile:avatar { data } · leaderboard:top { by }
 */
export function registerSocketHandlers(io, { rounds, config, store }) {
  const chatHistory = [];

  const broadcastPresence = () =>
    io.emit('presence', {
      online: io.engine.clientsCount,
      playing: io.sockets.adapter.rooms.get(GAME_ROOM)?.size ?? 0,
    });

  io.on('connection', async (socket) => {
    const lastChatAt = { t: 0 };
    const submitWindow = { start: Date.now(), count: 0 };
    const me = () => socket.data.player;
    const room = playerRoom(me().id);

    // ---- game
    socket.on('time:ping', (ack) => {
      if (typeof ack === 'function') ack(Date.now());
    });

    socket.on('game:join', (payload, ack) => {
      socket.join(GAME_ROOM);
      const progress = rounds.join(me(), { now: Boolean(payload?.now) });
      if (typeof ack === 'function') ack(progress);
      broadcastPresence();
    });

    socket.on('game:leave', () => {
      socket.leave(GAME_ROOM);
      broadcastPresence();
    });

    socket.on('word:submit', (payload, ack) => {
      if (typeof ack !== 'function') return;

      // Basic flood protection: max 15 submissions per second.
      const now = Date.now();
      if (now - submitWindow.start > 1000) Object.assign(submitWindow, { start: now, count: 0 });
      if (++submitWindow.count > 15) return ack({ ok: false, reason: 'rate_limited' });

      if (payload?.roundId !== rounds.roundId) return ack({ ok: false, reason: 'round_over' });
      ack(rounds.submitWord(me(), payload?.path));
    });

    socket.on('chat:send', (payload) => {
      const now = Date.now();
      if (now - lastChatAt.t < config.chat.minIntervalMs) return;
      const text = String(payload?.text || '').replace(/\s+/g, ' ').trim().slice(0, config.chat.maxLength);
      if (!text) return;
      lastChatAt.t = now;

      const msg = { id: randomUUID(), playerId: me().id, name: me().name, avatar: me().avatar, text, at: now };
      chatHistory.push(msg);
      if (chatHistory.length > config.chat.history) chatHistory.shift();
      io.emit('chat:message', msg);
    });

    registerSocialHandlers(io, socket, { store });
    registerShopHandlers(io, socket, { store });
    registerProfileHandlers(io, socket, { store, config });

    socket.on('disconnect', () => {
      broadcastPresence();
      if (!io.sockets.adapter.rooms.get(room)?.size) notifyFriends(io, store, me().id);
    });

    // ---- initial sync (after listeners are attached)
    socket.join(room);
    const firstSocket = io.sockets.adapter.rooms.get(room).size === 1;
    const player = await store.getOrCreatePlayer(me());

    socket.emit('sync', {
      state: rounds.publicState(),
      you: { ...me(), ...rounds.playerProgress(me().id) },
      chat: chatHistory,
      online: io.engine.clientsCount,
      player: serializePlayer(player),
      catalog: { tiles: TILE_SKINS, coinRules: COIN_RULES },
    });
    broadcastPresence();
    if (firstSocket) notifyFriends(io, store, me().id);
  });
}
