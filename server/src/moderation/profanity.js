// Profanity filter for player-written text: chat, direct messages and names.
//
// Matching works on a normalized copy of each word: lowercased, common
// look-alike characters mapped back to letters (0→o, 4→a, @→a, $→s …),
// separators inside the word removed (k.u.r.a.c → kurac) and repeated letters
// collapsed (kuuuurac → kurac). The original text is kept; only offending words
// are masked. It catches everyday abuse, not determined evasion.

// Croatian / regional roots, matched anywhere inside a word (so prefixes and
// endings are covered: odjebi, zajebavaš, pičkica, kurvin …).
const ANYWHERE = [
  'jeb', 'pizd', 'pičk', 'kurac', 'kurc', 'kurč', 'kurv', 'drolj', 'šupak', 'šupk',
  'seronj', 'sranj', 'govnar', 'peder', 'cigan', 'fufa', 'pušiona',
  // English, distinctive enough to match inside words
  'fuck', 'motherf', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'whore', 'pussy', 'asshole', 'retard',
];

// Short words that only count as whole words (to spare cocktail, Dickens, scrape …).
const WHOLE = new Set(['govno', 'govna', 'govnu', 'dick', 'cock', 'fag', 'fags', 'slut', 'cum', 'twat', 'wank', 'kys']);

// "pička" typed without diacritics folds to "pick…", which would also hit English
// words (picked, picky, picking), so those forms only count as whole words.
const FOLDED_WHOLE = /^pick(a|e|i|u|om|ama|ica|ice|icu|ici|icom)$/;

const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
const FOLDED_ROOTS = ANYWHERE.filter((r) => r !== 'pičk').map(fold);

const LOOKALIKE = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };

/** Normalized form of one word for matching (never shown to anyone). */
export function normalizeWord(word) {
  const mapped = [...word.toLocaleLowerCase('hr')].map((ch) => LOOKALIKE[ch] ?? ch).join('');
  return mapped
    .replace(/[^\p{L}]/gu, '') // drop separators inside the word
    .replace(/(\p{L})\1+/gu, '$1'); // collapse repeats
}

function isBad(word) {
  const n = normalizeWord(word);
  if (n.length < 3) return false;
  if (WHOLE.has(n)) return true;
  if (ANYWHERE.some((root) => n.includes(root))) return true;
  // People often type without diacritics (kurcina → kurčina, sranje is the same).
  const folded = fold(n);
  return FOLDED_WHOLE.test(folded) || FOLDED_ROOTS.some((root) => folded.includes(root));
}

/** True if any word in the text is offensive. */
export function hasProfanity(text) {
  return String(text || '')
    .split(/\s+/)
    .some(isBad);
}

/** Replaces offensive words with their first letter followed by asterisks. */
export function maskProfanity(text) {
  return String(text || '').replace(/\S+/g, (word) => {
    if (!isBad(word)) return word;
    const chars = [...word];
    return chars[0] + '*'.repeat(Math.max(chars.length - 1, 3));
  });
}
