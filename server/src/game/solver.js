import { scoreWord } from './scoring.js';

/**
 * Finds every dictionary word on the board via trie-pruned DFS.
 * Returns [{ word, points, path }] sorted by points desc, then alphabetically.
 * `path` is one valid tile path for the word (used to highlight it on reveal).
 */
export function solveBoard(board, neighbors, trie, minLen) {
  const found = new Map();
  const used = new Array(board.length).fill(false);
  const path = [];

  function dfs(i, node) {
    const next = node.children.get(board[i]);
    if (!next) return;
    used[i] = true;
    path.push(i);

    if (next.word && path.length >= minLen && !found.has(next.word)) {
      found.set(next.word, [...path]);
    }
    if (next.children.size) {
      for (const n of neighbors[i]) if (!used[n]) dfs(n, next);
    }

    path.pop();
    used[i] = false;
  }

  for (let i = 0; i < board.length; i++) dfs(i, trie.root);

  return [...found]
    .map(([word, p]) => ({ word, points: scoreWord(word), path: p }))
    .sort((a, b) => b.points - a.points || a.word.localeCompare(b.word, 'hr'));
}
