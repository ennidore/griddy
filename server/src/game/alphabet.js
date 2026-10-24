// Croatian alphabet as single-character tiles.
// The digraphs lj, nj and dž are NOT single tiles: they are spelled with two
// adjacent tiles (l+j, n+j, d+ž), so every tile is exactly one character.

// Approximate letter frequencies for Croatian text (percent), used to weight
// tile generation so boards contain playable letter mixes.
export const LETTER_WEIGHTS = {
  a: 11.5, i: 9.8, o: 9.0, e: 8.4, n: 6.6, j: 5.1, s: 5.0, r: 5.0,
  t: 4.8, u: 4.3, k: 3.6, v: 3.6, d: 3.3, m: 3.2, l: 3.0, p: 2.9,
  z: 1.8, g: 1.6, b: 1.5, č: 1.1, c: 1.0, š: 1.0, h: 0.8, ž: 0.6,
  ć: 0.6, đ: 0.3, f: 0.3,
};

export const ALPHABET = new Set(Object.keys(LETTER_WEIGHTS));
export const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

// Unicode has single-codepoint digraph ligatures (ǆ, ǉ, ǌ ...). Some word lists
// use them; split them into the two letters our tiles use.
const LIGATURES = {
  'ǆ': 'dž', 'ǅ': 'dž', 'Ǆ': 'dž',
  'ǉ': 'lj', 'ǈ': 'lj', 'Ǉ': 'lj',
  'ǌ': 'nj', 'ǋ': 'nj', 'Ǌ': 'nj',
};

export function normalizeWord(raw) {
  return raw
    .trim()
    .normalize('NFC')
    .replace(/[ǄǅǆǇǈǉǊǋǌ]/g, (ch) => LIGATURES[ch])
    .toLocaleLowerCase('hr');
}

export function isPlayableWord(word, minLen, maxLen) {
  // Length in tiles == length in characters, since each tile is one character.
  const chars = [...word];
  if (chars.length < minLen || chars.length > maxLen) return false;
  return chars.every((ch) => ALPHABET.has(ch));
}
