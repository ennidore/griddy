// Exponential scoring: every extra letter doubles the value.
// 3 → 2, 4 → 4, 5 → 8, 6 → 16, 7 → 32, 8 → 64 ...
export function scoreWord(word) {
  const len = [...word].length;
  return 2 ** (len - 2);
}
