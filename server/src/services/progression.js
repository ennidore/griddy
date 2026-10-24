import { levelFromXp, REWARDS } from '../progression/levels.js';
import { serializePlayer } from '../store/JsonStore.js';

export const playerRoom = (id) => `player:${id}`;

/**
 * Applies a finished round's rewards to each player's account and pushes the
 * updated account (plus a reward summary) to all of that player's sockets.
 */
export function createRoundSettler({ io, store }) {
  return async function settleRound(rankings) {
    for (const p of rankings) {
      if (p.wordCount === 0) continue;
      const before = await store.getPlayer(p.id);
      if (!before) continue;

      const levelsGained = levelFromXp(before.xp + p.rewards.xp) - levelFromXp(before.xp);
      const levelBonus = levelsGained * REWARDS.levelUp;
      const updated = await store.applyRoundResult(p.id, {
        xp: p.rewards.xp,
        coins: p.rewards.coins + levelBonus,
        score: p.score,
        words: p.wordCount,
        won: p.won,
        bestWord: p.bestWord,
      });

      io.to(playerRoom(p.id)).emit('player:update', {
        player: serializePlayer(updated),
        rewards: {
          ...p.rewards,
          coins: p.rewards.coins + levelBonus,
          levelUp: levelsGained > 0 ? levelFromXp(updated.xp) : null,
          levelBonus,
        },
      });
    }
  };
}
