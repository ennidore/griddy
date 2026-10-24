import { isAdjacent } from './board.js';

/**
 * Validates a client-submitted tile path. The server never trusts a word
 * string from the client; it rebuilds the word from the board itself.
 * Returns { ok: true, word } or { ok: false, reason }.
 */
export function validatePath(board, size, path, minLen) {
  if (!Array.isArray(path) || path.length < minLen || path.length > board.length) {
    return { ok: false, reason: 'too_short' };
  }
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    const i = path[k];
    if (!Number.isInteger(i) || i < 0 || i >= board.length) return { ok: false, reason: 'bad_path' };
    if (seen.has(i)) return { ok: false, reason: 'tile_reused' };
    if (k > 0 && !isAdjacent(path[k - 1], i, size)) return { ok: false, reason: 'not_adjacent' };
    seen.add(i);
  }
  return { ok: true, word: path.map((i) => board[i]).join('') };
}
