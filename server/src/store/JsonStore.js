import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { levelFromXp, levelProgress } from '../progression/levels.js';
import { DEFAULT_TILE, STARTER_ITEMS, STARTING_COINS } from '../shop/catalog.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const MAX_MESSAGES_PER_CONVERSATION = 200;

export const pairKey = (a, b) => [a, b].sort().join('|');

/** Player record → what clients may see about their own account. */
export function serializePlayer(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isGuest: p.isGuest,
    friendCode: p.friendCode,
    xp: p.xp,
    ...levelProgress(p.xp),
    coins: p.coins,
    owned: p.owned,
    equipped: p.equipped,
    stats: p.stats,
  };
}

/** What other players may see (friends list, requests). */
export const publicPlayer = (p) => p && { id: p.id, name: p.name, avatar: p.avatar, level: levelFromXp(p.xp) };

/**
 * Game-data store (progression, inventory, friends, direct messages) kept in
 * memory and persisted to a JSON file with debounced atomic writes.
 *
 * Every method is async so this can be swapped for a database-backed store
 * with the same interface without touching callers.
 */
export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    // accounts: lowercased username → { id, username, passwordHash, createdAt }
    // sessions: sha256(token) → { accountKey, createdAt, lastUsedAt }
    // guestSecrets: guest id → sha256(secret); proves a connecting guest owns that id
    this.data = { players: {}, friendships: {}, messages: {}, reads: {}, accounts: {}, sessions: {}, guestSecrets: {} };
    this.saveTimer = null;
  }

  async load() {
    try {
      const raw = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      this.data = { ...this.data, ...raw };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    this.codes = new Map(Object.values(this.data.players).map((p) => [p.friendCode, p.id]));
    return this;
  }

  #scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.flush().catch((e) => console.error('[store] save failed:', e)), 500);
  }

  /** Writes the current state now. Saves are queued so two never share the temp file. */
  flush() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const write = async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data));
      await fs.rename(tmp, this.filePath);
    };
    this.saving = (this.saving || Promise.resolve()).then(write, write);
    return this.saving;
  }

  #newFriendCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (!this.codes.has(code)) return code;
    }
  }

  // ----------------------------------------------------------- accounts
  // Username + password accounts. Passwords arrive already hashed (auth/passwords.js).

  async createAccount(username, passwordHash) {
    const key = username.toLocaleLowerCase('hr');
    if (this.data.accounts[key]) return { ok: false, reason: 'username_taken' };
    const account = { id: `user:${randomUUID()}`, username, passwordHash, createdAt: Date.now() };
    this.data.accounts[key] = account;
    await this.flush(); // accounts/sessions are written immediately
    return { ok: true, account: { ...account } };
  }

  async getAccountByUsername(username) {
    const a = this.data.accounts[String(username || '').trim().toLocaleLowerCase('hr')];
    return a ? { ...a } : null;
  }

  async isUsernameTaken(username, exceptId = null) {
    const a = this.data.accounts[String(username || '').trim().toLocaleLowerCase('hr')];
    return Boolean(a && a.id !== exceptId);
  }

  /** Changes an account's username (must stay unique) and its player name. */
  async renameAccount(id, newName) {
    const entry = Object.entries(this.data.accounts).find(([, a]) => a.id === id);
    if (!entry) return { ok: false, reason: 'unknown_account' };
    const [oldKey, account] = entry;
    const newKey = newName.toLocaleLowerCase('hr');
    if (newKey !== oldKey && this.data.accounts[newKey]) return { ok: false, reason: 'username_taken' };
    delete this.data.accounts[oldKey];
    account.username = newName;
    this.data.accounts[newKey] = account;
    for (const s of Object.values(this.data.sessions)) if (s.accountKey === oldKey) s.accountKey = newKey;
    if (this.data.players[id]) this.data.players[id].name = newName;
    await this.flush(); // accounts/sessions are written immediately
    return { ok: true };
  }

  async createSession(tokenHash, username) {
    const now = Date.now();
    this.data.sessions[tokenHash] = { accountKey: username.toLocaleLowerCase('hr'), createdAt: now, lastUsedAt: now };
    await this.flush(); // accounts/sessions are written immediately
  }

  /** → account for a session token hash, or null if unknown/expired. */
  async getSessionAccount(tokenHash, maxAgeMs) {
    const s = this.data.sessions[tokenHash];
    if (!s) return null;
    if (Date.now() - s.lastUsedAt > maxAgeMs) {
      delete this.data.sessions[tokenHash];
      this.#scheduleSave();
      return null;
    }
    s.lastUsedAt = Date.now();
    this.#scheduleSave();
    const a = this.data.accounts[s.accountKey];
    return a ? { ...a } : null;
  }

  async deleteSession(tokenHash) {
    delete this.data.sessions[tokenHash];
    await this.flush(); // accounts/sessions are written immediately
  }

  // ------------------------------------------------------------- guests
  // Guest ids are visible to other players (leaderboards, chat, friends), so an
  // id alone must not be enough to play as that guest. The first connection
  // that presents a secret for an id claims it; after that the id only works
  // with the same secret.

  /** → 'ok' (secret matches), 'claimed' (first use, now bound) or 'mismatch'. */
  async verifyGuest(guestId, secretHash) {
    const known = this.data.guestSecrets[guestId];
    if (!known) {
      this.data.guestSecrets[guestId] = secretHash;
      await this.flush(); // written immediately, like accounts
      return 'claimed';
    }
    const a = Buffer.from(known, 'hex');
    const b = Buffer.from(secretHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'mismatch';
  }

  // ------------------------------------------------------------ players

  async getOrCreatePlayer({ id, name, avatar, isGuest }) {
    let p = this.data.players[id];
    if (!p) {
      p = {
        id,
        name,
        avatar,
        isGuest,
        friendCode: this.#newFriendCode(),
        xp: 0,
        coins: STARTING_COINS,
        owned: [...STARTER_ITEMS],
        equipped: { tile: DEFAULT_TILE },
        stats: { gamesPlayed: 0, highestScore: 0, totalWords: 0, wins: 0, longestWord: '' },
        createdAt: Date.now(),
      };
      this.data.players[id] = p;
      this.codes.set(p.friendCode, id);
    }
    Object.assign(p, { name, avatar, lastSeenAt: Date.now() });
    this.#scheduleSave();
    return structuredClone(p);
  }

  async setPlayerAvatar(id, avatar) {
    const p = this.data.players[id];
    if (!p) return null;
    p.avatar = avatar;
    this.#scheduleSave();
    return structuredClone(p);
  }

  async getPlayer(id) {
    const p = this.data.players[id];
    return p ? structuredClone(p) : null;
  }

  async getPlayers(ids) {
    return ids.map((id) => this.data.players[id]).filter(Boolean).map((p) => structuredClone(p));
  }

  async findByFriendCode(code) {
    const id = this.codes.get(String(code || '').trim().toUpperCase().replace(/^#/, ''));
    return id ? this.getPlayer(id) : null;
  }

  async applyRoundResult(id, { xp, coins, score, words, won, bestWord }) {
    const p = this.data.players[id];
    if (!p) return null;
    p.xp += xp;
    p.coins += coins;
    p.stats.gamesPlayed += 1;
    p.stats.totalWords += words;
    p.stats.highestScore = Math.max(p.stats.highestScore, score);
    if (won) p.stats.wins += 1;
    if (bestWord && [...bestWord].length > [...p.stats.longestWord].length) p.stats.longestWord = bestWord;
    this.#scheduleSave();
    return structuredClone(p);
  }

  async purchase(id, item) {
    const p = this.data.players[id];
    if (!p) return { ok: false, reason: 'unknown_player' };
    if (p.owned.includes(item.id)) return { ok: false, reason: 'already_owned' };
    if (levelFromXp(p.xp) < item.minLevel) return { ok: false, reason: 'level_too_low' };
    if (p.coins < item.price) return { ok: false, reason: 'not_enough_coins' };
    p.coins -= item.price;
    p.owned.push(item.id);
    this.#scheduleSave();
    return { ok: true, player: structuredClone(p) };
  }

  async equip(id, slot, itemId) {
    const p = this.data.players[id];
    if (!p) return { ok: false, reason: 'unknown_player' };
    if (!p.owned.includes(itemId)) return { ok: false, reason: 'not_owned' };
    p.equipped[slot] = itemId;
    this.#scheduleSave();
    return { ok: true, player: structuredClone(p) };
  }

  /** All-time leaderboard. `by`: 'score' (best round) | 'wins' | 'level' | 'words'. */
  async topPlayers(limit = 20, by = 'score') {
    const key = {
      score: (p) => p.stats.highestScore,
      wins: (p) => p.stats.wins,
      level: (p) => p.xp,
      words: (p) => p.stats.totalWords,
    }[by] || ((p) => p.stats.highestScore);
    return Object.values(this.data.players)
      .filter((p) => p.stats.gamesPlayed > 0)
      .sort((a, b) => key(b) - key(a) || b.xp - a.xp)
      .slice(0, limit)
      .map((p) => ({
        ...publicPlayer(p),
        highestScore: p.stats.highestScore,
        wins: p.stats.wins,
        totalWords: p.stats.totalWords,
        gamesPlayed: p.stats.gamesPlayed,
      }));
  }

  /** Case-insensitive username search; exact matches first. */
  async searchPlayers(query, excludeId, limit = 8) {
    const q = String(query || '').trim().toLocaleLowerCase('hr');
    if (q.length < 2) return [];
    return Object.values(this.data.players)
      .filter((p) => p.id !== excludeId && p.name?.toLocaleLowerCase('hr').includes(q))
      .sort((a, b) => {
        const ea = a.name.toLocaleLowerCase('hr') === q;
        const eb = b.name.toLocaleLowerCase('hr') === q;
        return eb - ea || (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
      })
      .slice(0, limit)
      .map(publicPlayer);
  }

  // ------------------------------------------------------------ friends

  /** → [{ otherId, status: 'accepted' | 'incoming' | 'outgoing' }] */
  async listFriendships(id) {
    return Object.values(this.data.friendships)
      .filter((f) => f.a === id || f.b === id)
      .map((f) => ({
        otherId: f.a === id ? f.b : f.a,
        status: f.status === 'accepted' ? 'accepted' : f.requestedBy === id ? 'outgoing' : 'incoming',
      }));
  }

  async getFriendship(a, b) {
    const f = this.data.friendships[pairKey(a, b)];
    return f ? { ...f } : null;
  }

  async requestFriend(from, to) {
    const key = pairKey(from, to);
    const existing = this.data.friendships[key];
    if (existing?.status === 'accepted') return { ok: false, reason: 'already_friends' };
    if (existing && existing.requestedBy === from) return { ok: false, reason: 'already_requested' };
    if (existing) {
      // They already asked us: treat our request as acceptance.
      existing.status = 'accepted';
      this.#scheduleSave();
      return { ok: true, status: 'accepted' };
    }
    const [a, b] = [from, to].sort();
    this.data.friendships[key] = { a, b, status: 'pending', requestedBy: from, createdAt: Date.now() };
    this.#scheduleSave();
    return { ok: true, status: 'pending' };
  }

  async respondFriend(id, otherId, accept) {
    const key = pairKey(id, otherId);
    const f = this.data.friendships[key];
    if (!f || f.status !== 'pending' || f.requestedBy === id) return { ok: false, reason: 'no_request' };
    if (accept) f.status = 'accepted';
    else delete this.data.friendships[key];
    this.#scheduleSave();
    return { ok: true };
  }

  async removeFriend(id, otherId) {
    delete this.data.friendships[pairKey(id, otherId)];
    this.#scheduleSave();
    return { ok: true };
  }

  // ----------------------------------------------------------- messages

  async addMessage(from, to, text) {
    const key = pairKey(from, to);
    const msg = { id: randomUUID(), from, to, text, at: Date.now() };
    const list = (this.data.messages[key] ||= []);
    list.push(msg);
    if (list.length > MAX_MESSAGES_PER_CONVERSATION) list.splice(0, list.length - MAX_MESSAGES_PER_CONVERSATION);
    this.#scheduleSave();
    return msg;
  }

  async getConversation(a, b, limit = 100) {
    return (this.data.messages[pairKey(a, b)] || []).slice(-limit);
  }

  async markRead(reader, otherId) {
    (this.data.reads[reader] ||= {})[otherId] = Date.now();
    this.#scheduleSave();
  }

  /** → { [otherId]: { unread, last } } for each conversation of `id`. */
  async conversationSummaries(id) {
    const out = {};
    const reads = this.data.reads[id] || {};
    for (const [key, list] of Object.entries(this.data.messages)) {
      const [a, b] = key.split('|');
      if (a !== id && b !== id) continue;
      const other = a === id ? b : a;
      const lastRead = reads[other] || 0;
      out[other] = {
        unread: list.filter((m) => m.to === id && m.at > lastRead).length,
        last: list[list.length - 1] || null,
      };
    }
    return out;
  }
}
