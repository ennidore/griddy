export const PHASE = { ACTIVE: 'active', REVEAL: 'reveal', LEADERBOARD: 'leaderboard' };

export const MIN_WORD_LENGTH = 3;

export function isAdjacent(a, b, size) {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
  const dc = Math.abs((a % size) - (b % size));
  return a !== b && dr <= 1 && dc <= 1;
}

/** Mirror of the server's scoring, used only for display hints. */
export const scoreForLength = (len) => 2 ** (len - 2);

export const toWord = (board, path) => path.map((i) => board[i]).join('');

export const upper = (s) => s.toLocaleUpperCase('hr');

export const REJECT_MESSAGES = {
  not_a_word: 'Nije u rječniku',
  already_found: 'Već pronađeno',
  round_over: 'Runda je završila',
  too_short: 'Prekratko',
  not_adjacent: 'Slova nisu susjedna',
  tile_reused: 'Polje je već iskorišteno',
  rate_limited: 'Polako!',
  timeout: 'Nema veze sa serverom',
  offline: 'Nema veze sa serverom',
};

export function formatClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Croatian plural: plural(n, 'runda', 'runde', 'rundi') → 1 runda, 3 runde, 5 rundi, 21 runda. */
export function plural(n, one, few, many) {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}
