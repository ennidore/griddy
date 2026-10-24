import { LETTER_WEIGHTS, VOWELS } from './alphabet.js';

const LETTERS = Object.keys(LETTER_WEIGHTS);
const TOTAL_WEIGHT = LETTERS.reduce((sum, l) => sum + LETTER_WEIGHTS[l], 0);

/** neighbors[i] = indices adjacent to tile i (8-directional). */
export function buildNeighbors(size) {
  const neighbors = [];
  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) list.push(nr * size + nc);
      }
    }
    neighbors.push(list);
  }
  return neighbors;
}

export function isAdjacent(a, b, size) {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
  const dc = Math.abs((a % size) - (b % size));
  return a !== b && dr <= 1 && dc <= 1;
}

function pickLetter(rng) {
  let x = rng() * TOTAL_WEIGHT;
  for (const l of LETTERS) {
    x -= LETTER_WEIGHTS[l];
    if (x <= 0) return l;
  }
  return LETTERS[LETTERS.length - 1];
}

/**
 * Random board as a flat array of size*size lowercase letters.
 * Constraints keep it playable: 5–8 vowels, no consonant more than twice,
 * no vowel more than three times.
 */
export function generateBoard(size, rng = Math.random) {
  const cells = size * size;
  for (;;) {
    const board = [];
    const counts = {};
    while (board.length < cells) {
      const l = pickLetter(rng);
      const max = VOWELS.has(l) ? 3 : 2;
      if ((counts[l] || 0) >= max) continue;
      counts[l] = (counts[l] || 0) + 1;
      board.push(l);
    }
    const vowels = board.filter((l) => VOWELS.has(l)).length;
    if (vowels >= 5 && vowels <= 8) return board;
  }
}
