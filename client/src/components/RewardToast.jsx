import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';

export const REWARD_LABELS = {
  win: 'Pobjeda',
  top10: 'Top 10',
  longest_word: 'Najduža riječ',
};

/** App-wide toast for coins/XP earned at the end of a round and level-ups. */
export default function RewardToast() {
  const { rewards, clearRewards } = useGame();

  useEffect(() => {
    if (!rewards) return;
    const t = setTimeout(clearRewards, 4500);
    return () => clearTimeout(t);
  }, [rewards, clearRewards]);

  const visible = rewards && (rewards.coins > 0 || rewards.xp > 0);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={rewards.id}
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="pointer-events-auto flex items-center gap-3 rounded-md bg-ink px-4 py-2.5 text-paper shadow-xl"
          >
            {rewards.levelUp ? (
              <span className="flex items-center gap-1.5 font-black text-sun">
                <Sparkles className="size-5" /> Razina {rewards.levelUp}!
              </span>
            ) : null}
            <span className="flex items-center gap-1 font-black">
              <Coins className="size-4 text-sun" /> +{rewards.coins}
            </span>
            <span className="font-black text-grape-soft">+{rewards.xp} XP</span>
            {rewards.breakdown?.length > 0 && (
              <span className="hidden text-xs font-bold opacity-70 sm:inline">
                {rewards.breakdown.map((b) => REWARD_LABELS[b.reason]).join(' · ')}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
