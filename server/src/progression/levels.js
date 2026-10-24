// Cumulative XP needed to reach a level: 50·L·(L−1)
// L2 at 100 XP, L3 at 300, L4 at 600, L5 at 1000, L8 at 2800 …
export const xpForLevel = (level) => 50 * level * (level - 1);

export function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  return { level, levelXp: xp - base, levelSize: xpForLevel(level + 1) - base };
}

// Coins per round. A win replaces the top-10 reward; the longest-word bonus stacks.
export const REWARDS = {
  win: 15, // rank 1 (ties all win)
  top10: 10, // rank 2–10
  longestWord: 5, // found the round's longest word (among players)
  levelUp: 25, // per level gained
  participationXp: 10,
};

/** The coin rules shown to players (sent to clients in `sync`). */
export const COIN_RULES = {
  win: REWARDS.win,
  top10: REWARDS.top10,
  longestWord: REWARDS.longestWord,
  levelUp: REWARDS.levelUp,
};

/**
 * Pure reward calculation for a finished round. Only players who found at
 * least one word earn anything, so idle joiners can't farm coins.
 * Returns rankings with `rewards: { xp, coins, breakdown[] }` added.
 */
export function computeRoundRewards(rankings) {
  const len = (w) => (w ? [...w].length : 0);
  const longest = Math.max(0, ...rankings.filter((p) => p.wordCount > 0).map((p) => len(p.bestWord)));

  return rankings.map((p) => {
    const breakdown = [];
    if (p.wordCount > 0) {
      if (p.won) breakdown.push({ reason: 'win', coins: REWARDS.win });
      else if (p.rank <= 10) breakdown.push({ reason: 'top10', coins: REWARDS.top10 });
      if (longest > 0 && len(p.bestWord) === longest) {
        breakdown.push({ reason: 'longest_word', coins: REWARDS.longestWord });
      }
    }
    return {
      ...p,
      rewards: {
        xp: p.wordCount > 0 ? p.score + REWARDS.participationXp : 0,
        coins: breakdown.reduce((sum, b) => sum + b.coins, 0),
        breakdown,
      },
    };
  });
}
