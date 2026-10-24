import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeWord, isPlayableWord } from '../src/game/alphabet.js';
import { buildNeighbors, generateBoard, isAdjacent } from '../src/game/board.js';
import { Trie } from '../src/game/dictionary.js';
import { solveBoard } from '../src/game/solver.js';
import { validatePath } from '../src/game/validate.js';
import { scoreWord } from '../src/game/scoring.js';

test('normalizes case and digraph ligatures', () => {
  assert.equal(normalizeWord('  ČAŠA '), 'čaša');
  assert.equal(normalizeWord('ǉubav'), 'ljubav');
  assert.equal(normalizeWord('ǆep'), 'džep');
});

test('rejects foreign letters and short words', () => {
  assert.equal(isPlayableWord('kuća', 3, 16), true);
  assert.equal(isPlayableWord('wifi', 3, 16), false);
  assert.equal(isPlayableWord('da', 3, 16), false);
});

test('adjacency includes diagonals, excludes wraps', () => {
  assert.equal(isAdjacent(0, 5, 4), true);
  assert.equal(isAdjacent(3, 4, 4), false);
  assert.equal(buildNeighbors(4)[5].length, 8);
});

test('generated boards are 16 letters with 5–8 vowels', () => {
  for (let i = 0; i < 50; i++) {
    const b = generateBoard(4);
    assert.equal(b.length, 16);
    const v = b.filter((l) => 'aeiou'.includes(l)).length;
    assert.ok(v >= 5 && v <= 8);
  }
});

test('solver finds digraph words spelled across two tiles', () => {
  // l j u b
  // a v x x   (x = filler)
  const board = ['l', 'j', 'u', 'b', 'k', 'v', 'a', 't', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e'];
  const trie = new Trie();
  ['ljubav', 'lju', 'kat'].forEach((w) => trie.insert(w));
  const words = solveBoard(board, buildNeighbors(4), trie, 3).map((s) => s.word);
  assert.ok(words.includes('ljubav'));
  assert.ok(words.includes('lju'));
  assert.ok(!words.includes('kat')); // k(4) and a(6) aren't adjacent
});

test('path validation', () => {
  const board = 'abcdefghijklmnop'.split('');
  assert.deepEqual(validatePath(board, 4, [0, 1, 2], 3), { ok: true, word: 'abc' });
  assert.equal(validatePath(board, 4, [0, 1, 0], 3).reason, 'tile_reused');
  assert.equal(validatePath(board, 4, [0, 2, 3], 3).reason, 'not_adjacent');
  assert.equal(validatePath(board, 4, [0, 1], 3).reason, 'too_short');
});

test('scoring doubles per letter', () => {
  assert.deepEqual(['kuć', 'kuća', 'kućan'].map(scoreWord), [2, 4, 8]);
});
