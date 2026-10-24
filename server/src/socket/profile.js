import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { USERNAME_RE } from '../auth/passwords.js';
import { AVATAR_RE } from './auth.js';
import { playerRoom } from '../services/progression.js';
import { serializePlayer } from '../store/JsonStore.js';

const MAX_AVATAR_BYTES = 300 * 1024;
const DATA_URL_RE = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/;
const EXT = { webp: 'webp', png: 'png', jpeg: 'jpg' };

/**
 * Profile picture uploads and the all-time leaderboard.
 *
 * Images arrive as a data URL (the client crops/resizes them first), are
 * written to <avatarDir>/<sha1(player id)>.<ext> and served by Express at
 * /api/avatars/. The returned URL carries a version query to bust caches.
 */
export function registerProfileHandlers(io, socket, { store, config }) {
  const reply = (ack, value) => typeof ack === 'function' && ack(value);

  // Accounts change name/picture on the server (guests keep theirs in the
  // browser and send them in the handshake).
  socket.on('profile:update', async (payload, ack) => {
    const me = socket.data.player;
    if (me.isGuest) return reply(ack, { ok: false, reason: 'guest' });
    const patch = {};

    if (payload?.name !== undefined) {
      const name = String(payload.name).trim();
      if (!USERNAME_RE.test(name)) return reply(ack, { ok: false, reason: 'bad_username' });
      const res = await store.renameAccount(me.id, name);
      if (!res.ok) return reply(ack, res);
      patch.name = name;
    }
    if (payload?.avatar !== undefined) {
      if (!AVATAR_RE.test(String(payload.avatar))) return reply(ack, { ok: false, reason: 'bad_avatar' });
      await store.setPlayerAvatar(me.id, payload.avatar);
      patch.avatar = payload.avatar;
    }

    // Update every open socket of this player, then push the new account.
    for (const sid of io.sockets.adapter.rooms.get(playerRoom(me.id)) || []) {
      Object.assign(io.sockets.sockets.get(sid)?.data.player || {}, patch);
    }
    const player = await store.getPlayer(me.id);
    io.to(playerRoom(me.id)).emit('player:update', { player: serializePlayer(player) });
    reply(ack, { ok: true });
  });

  socket.on('profile:avatar', async (payload, ack) => {
    const match = DATA_URL_RE.exec(String(payload?.data || ''));
    if (!match) return reply(ack, { ok: false, reason: 'bad_image' });
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > MAX_AVATAR_BYTES) return reply(ack, { ok: false, reason: 'too_large' });

    const name = `${createHash('sha1').update(socket.data.player.id).digest('hex')}.${EXT[match[1]]}`;
    await fs.mkdir(config.avatarDir, { recursive: true });
    // Remove older uploads in other formats for this player.
    await Promise.all(
      Object.values(EXT)
        .filter((ext) => !name.endsWith(`.${ext}`))
        .map((ext) => fs.rm(path.join(config.avatarDir, name.replace(/\.\w+$/, `.${ext}`)), { force: true })),
    );
    await fs.writeFile(path.join(config.avatarDir, name), bytes);
    reply(ack, { ok: true, url: `/api/avatars/${name}?v=${Date.now()}` });
  });

  socket.on('leaderboard:top', async (payload, ack) => {
    const by = ['score', 'wins', 'level', 'words'].includes(payload?.by) ? payload.by : 'score';
    reply(ack, { ok: true, by, players: await store.topPlayers(50, by) });
  });
}
