import fs from 'node:fs/promises';
import { normalizeWord, isPlayableWord } from './alphabet.js';

/** Character trie used by the solver to prune dead-end paths. */
export class Trie {
  constructor() {
    this.root = { children: new Map(), word: null };
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), word: null };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.word = word;
  }
}

/**
 * Loads a word list file. Accepted line formats:
 *   "kuća"            plain word
 *   "kuća/AB"         hunspell .dic line (flags ignored; expand with `unmunch` for inflections)
 *   "kuća\t1234"      frequency list (first column used)
 * Lines starting with '#' are comments.
 */
export async function loadDictionary(filePath, { minLen, maxLen }) {
  const text = await fs.readFile(filePath, 'utf8');
  const words = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const raw = line.split(/[\s/]/)[0];
    if (!raw || /^\p{Lu}/u.test(raw)) continue; // skip proper nouns
    const word = normalizeWord(raw);
    if (isPlayableWord(word, minLen, maxLen)) words.add(word);
  }

  const trie = new Trie();
  for (const w of words) trie.insert(w);

  return {
    size: words.size,
    has: (w) => words.has(w),
    trie,
  };
}
