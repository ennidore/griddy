import { AnimatePresence, motion } from 'framer-motion';
import { MIN_WORD_LENGTH, REJECT_MESSAGES, scoreForLength, upper } from '../../lib/game.js';

/**
 * Line above the board: the word being dragged (with its potential value),
 * or the verdict for the last submitted word.
 */
export default function WordPreview({ currentWord, result }) {
  let content;
  if (currentWord) {
    const len = [...currentWord].length;
    content = (
      <motion.div key="current" className="flex items-baseline gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="text-3xl font-black tracking-[0.12em] text-grape">{upper(currentWord)}</span>
        {len >= MIN_WORD_LENGTH && <span className="text-sm font-bold text-ink-soft">+{scoreForLength(len)}</span>}
      </motion.div>
    );
  } else if (result) {
    const tone = result.ok ? 'bg-mint text-white' : result.reason === 'already_found' ? 'bg-sun text-ink' : 'bg-coral text-white';
    content = (
      <motion.div
        key={result.id}
        initial={{ y: 12, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -12, opacity: 0 }}
        className={`rounded-md px-4 py-1.5 text-sm font-extrabold ${tone}`}
      >
        {result.ok
          ? `+${result.points} · ${upper(result.word)}`
          : `${result.word ? `${upper(result.word)} · ` : ''}${REJECT_MESSAGES[result.reason] || 'Ne može'}`}
      </motion.div>
    );
  }

  return (
    <div className="flex h-12 items-center justify-center">
      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </div>
  );
}
