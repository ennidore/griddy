import { playerRoom } from '../services/progression.js';
import { serializePlayer } from '../store/JsonStore.js';
import { findTileSkin } from '../shop/catalog.js';

export function registerShopHandlers(io, socket, { store }) {
  const me = () => socket.data.player.id;
  const reply = (ack, value) => typeof ack === 'function' && ack(value);
  const pushUpdate = (player) => io.to(playerRoom(me())).emit('player:update', { player: serializePlayer(player) });

  socket.on('shop:buy', async (payload, ack) => {
    const item = findTileSkin(payload?.itemId);
    if (!item) return reply(ack, { ok: false, reason: 'unknown_item' });
    const res = await store.purchase(me(), item);
    if (res.ok) pushUpdate(res.player);
    reply(ack, { ok: res.ok, reason: res.reason });
  });

  socket.on('shop:equip', async (payload, ack) => {
    const item = findTileSkin(payload?.itemId);
    if (!item) return reply(ack, { ok: false, reason: 'unknown_item' });
    const res = await store.equip(me(), 'tile', item.id);
    if (res.ok) pushUpdate(res.player);
    reply(ack, { ok: res.ok, reason: res.reason });
  });
}
