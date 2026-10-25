import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

import { computeRoundRewards, levelFromXp, xpForLevel } from '../src/progression/levels.js';
import { JsonStore } from '../src/store/JsonStore.js';
import { findTileSkin } from '../src/shop/catalog.js';
import { createRoundSettler } from '../src/services/progression.js';

test('level curve', () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  assert.equal(levelFromXp(xpForLevel(8)), 8);
});

test('round rewards: win 15, top 10 10, longest word +5, idle players get nothing', () => {
  const rankings = [
    { id: 'a', rank: 1, won: true, score: 30, wordCount: 5, bestWord: 'kuća' },
    { id: 'b', rank: 2, won: false, score: 20, wordCount: 3, bestWord: 'ljubav' },
    { id: 'c', rank: 5, won: false, score: 4, wordCount: 1, bestWord: 'dan' },
    { id: 'd', rank: 6, won: false, score: 0, wordCount: 0, bestWord: null },
  ];
  const [a, b, c, d] = computeRoundRewards(rankings).map((p) => p.rewards);
  assert.equal(a.coins, 15);
  assert.equal(b.coins, 10 + 5); // top 10 + longest word
  assert.equal(c.coins, 10);
  assert.deepEqual(d, { xp: 0, coins: 0, breakdown: [] });
  assert.equal(a.xp, 40);
});

test('settling a round pays +25 coins per level gained', async () => {
  const store = await freshStore();
  await store.getOrCreatePlayer({ id: 'p', name: 'P', avatar: null, isGuest: true });
  await store.applyRoundResult('p', { xp: 95, coins: 0, score: 0, words: 0, won: false, bestWord: null });

  const sent = [];
  const io = { to: () => ({ emit: (event, payload) => sent.push(payload) }) };
  const [p] = computeRoundRewards([{ id: 'p', rank: 1, won: true, score: 2, wordCount: 1, bestWord: 'dan' }]);
  await createRoundSettler({ io, store })([p]);

  // 95 + (2 + 10) XP crosses 100 → level 2. Coins: start 100 + win 15 + longest 5 + level-up 25.
  const after = await store.getPlayer('p');
  assert.equal(levelFromXp(after.xp), 2);
  assert.equal(after.coins, 100 + 15 + 5 + 25);
  assert.equal(sent[0].rewards.levelUp, 2);
  assert.equal(sent[0].rewards.levelBonus, 25);
});

async function freshStore() {
  return new JsonStore(path.join(os.tmpdir(), `griddy-test-${Date.now()}-${Math.random()}.json`)).load();
}

test('shop: level gate, coins, ownership, equip', async () => {
  const store = await freshStore();
  await store.getOrCreatePlayer({ id: 'p', name: 'P', avatar: null, isGuest: true });
  const bombon = findTileSkin('bombon');

  assert.equal((await store.purchase('p', bombon)).reason, 'level_too_low');
  await store.applyRoundResult('p', { xp: 100, coins: 300, score: 1, words: 1, won: false, bestWord: 'dan' });
  const bought = await store.purchase('p', bombon);
  assert.equal(bought.ok, true);
  assert.equal(bought.player.coins, 100);
  assert.equal((await store.purchase('p', bombon)).reason, 'already_owned');
  assert.equal((await store.equip('p', 'tile', 'zlato')).reason, 'not_owned');
  assert.equal((await store.equip('p', 'tile', 'bombon')).player.equipped.tile, 'bombon');
});

test('search by username and leaderboard ordering', async () => {
  const store = await freshStore();
  await store.getOrCreatePlayer({ id: 'a', name: 'Marko', avatar: null, isGuest: true });
  await store.getOrCreatePlayer({ id: 'b', name: 'Markica', avatar: null, isGuest: true });
  await store.getOrCreatePlayer({ id: 'c', name: 'Ana', avatar: null, isGuest: true });

  const hits = (await store.searchPlayers('mark', 'c')).map((p) => p.name);
  assert.deepEqual(hits.sort(), ['Markica', 'Marko']);
  assert.equal((await store.searchPlayers('MARKO', 'c'))[0].name, 'Marko'); // exact match first
  assert.deepEqual(await store.searchPlayers('ana', 'c'), []); // never yourself
  assert.deepEqual(await store.searchPlayers('m', 'c'), []); // min 2 chars

  await store.applyRoundResult('a', { xp: 500, coins: 0, score: 10, words: 3, won: false, bestWord: 'dan' });
  await store.applyRoundResult('b', { xp: 50, coins: 0, score: 40, words: 9, won: true, bestWord: 'kuća' });
  assert.deepEqual((await store.topPlayers(10, 'score')).map((p) => p.id), ['b', 'a']);
  assert.deepEqual((await store.topPlayers(10, 'level')).map((p) => p.id), ['a', 'b']);
  assert.equal((await store.topPlayers(10)).length, 2); // players with no games are hidden
});

test('friends: request by code, accept, DM unread counts', async () => {
  const store = await freshStore();
  await store.getOrCreatePlayer({ id: 'a', name: 'A', avatar: null, isGuest: true });
  const b = await store.getOrCreatePlayer({ id: 'b', name: 'B', avatar: null, isGuest: true });

  const found = await store.findByFriendCode(`#${b.friendCode.toLowerCase()}`);
  assert.equal(found.id, 'b');

  assert.equal((await store.requestFriend('a', 'b')).status, 'pending');
  assert.deepEqual(await store.listFriendships('b'), [{ otherId: 'a', status: 'incoming' }]);
  assert.equal((await store.respondFriend('a', 'b', true)).ok, false); // requester can't accept
  assert.equal((await store.respondFriend('b', 'a', true)).ok, true);

  await store.addMessage('a', 'b', 'bok');
  await store.addMessage('a', 'b', 'kako si?');
  assert.equal((await store.conversationSummaries('b')).a.unread, 2);
  await store.markRead('b', 'a');
  assert.equal((await store.conversationSummaries('b')).a.unread, 0);
});

test('accounts: unique usernames, password check, sessions, rename', async () => {
  const { hashPassword, verifyPassword, hashToken, validateCredentials } = await import('../src/auth/passwords.js');
  const store = await freshStore();

  assert.equal(validateCredentials('ab', 'secret1').reason, 'bad_username');
  assert.equal(validateCredentials('Ivana', '123').reason, 'bad_password');
  assert.equal(validateCredentials('Šime_92', 'secret1').ok, true);

  const hash = await hashPassword('secret1');
  assert.equal(await verifyPassword('secret1', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);

  const { account } = await store.createAccount('Ivana', hash);
  assert.equal((await store.createAccount('ivana', hash)).reason, 'username_taken'); // case-insensitive
  assert.equal((await store.getAccountByUsername('IVANA')).id, account.id);

  await store.createSession(hashToken('tok'), 'Ivana');
  assert.equal((await store.getSessionAccount(hashToken('tok'), 60_000)).id, account.id);
  assert.equal(await store.getSessionAccount(hashToken('nope'), 60_000), null);

  await store.createAccount('Marko', hash);
  assert.equal((await store.renameAccount(account.id, 'marko')).reason, 'username_taken');
  assert.equal((await store.renameAccount(account.id, 'Ivy')).ok, true);
  assert.equal((await store.getSessionAccount(hashToken('tok'), 60_000)).username, 'Ivy'); // session follows rename

  await store.deleteSession(hashToken('tok'));
  assert.equal(await store.getSessionAccount(hashToken('tok'), 60_000), null);
});

test('guest ids: first secret claims the id, others are refused', async () => {
  const { hashToken } = await import('../src/auth/passwords.js');
  const store = await freshStore();
  const id = 'guest:1234-abcd-5678';
  assert.equal(await store.verifyGuest(id, hashToken('owner-secret')), 'claimed');
  assert.equal(await store.verifyGuest(id, hashToken('owner-secret')), 'ok');
  assert.equal(await store.verifyGuest(id, hashToken('someone-else')), 'mismatch');
});

test('offensive usernames are refused at sign-up', async () => {
  const { validateCredentials } = await import('../src/auth/passwords.js');
  assert.equal(validateCredentials('kurac123', 'secret1').reason, 'inappropriate_username');
  assert.equal(validateCredentials('Sh1tLord', 'secret1').reason, 'inappropriate_username');
  assert.equal(validateCredentials('Ivana_92', 'secret1').ok, true);
});
