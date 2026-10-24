import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, X } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { PHASE, formatClock, upper } from '../lib/game.js';

/** Words found this round, newest first, numbered in the order found. */
function PlayedWords({ words }) {
  return (
    <div className="scroll-soft min-h-0 overflow-y-auto rounded-lg bg-surface p-1.5">
      {words.length === 0 ? (
        <p className="p-1.5 text-xs leading-snug text-ink-soft">Povuci preko susjednih slova (min. 3).</p>
      ) : (
        <ol className="space-y-1">
          <AnimatePresence initial={false}>
            {words.map(({ word, points }, i) => (
              <motion.li
                key={word}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 rounded-md bg-grape-soft py-0.5 pr-1.5 pl-0.5"
              >
                <span className="grid h-5 min-w-5 place-items-center rounded-sm bg-grape px-1 text-[10px] font-black text-white tabular-nums">
                  {words.length - i}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{upper(word)}</span>
                <span className="text-[10px] font-bold text-ink-soft">+{points}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

/** One row per word length: found / total on the board (grey when the board has none). */
function LengthCounts({ counts, found }) {
  const present = Object.keys(counts).map(Number);
  const max = Math.max(8, ...present);
  const lengths = Array.from({ length: max - 2 }, (_, i) => i + 3);

  return (
    <ul aria-label="Riječi po duljini" className="flex min-h-0 flex-col justify-between rounded-lg bg-surface px-2 py-1.5">
      {lengths.map((len) => {
        const total = counts[len] || 0;
        const have = found[len] || 0;
        const done = total > 0 && have >= total;
        return (
          <li key={len} className="flex items-center justify-between gap-1">
            <span className={`text-xs font-bold ${total ? '' : 'text-ink-soft/60'}`}>{len} slova</span>
            <span
              className={`grid h-[18px] min-w-9 place-items-center rounded-sm px-1 text-[11px] font-black tabular-nums ${
                !total ? 'bg-paper-deep' : done ? 'bg-mint text-white' : 'bg-grape text-white'
              }`}
            >
              {total ? `${have}/${total}` : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Timer() {
  const { state } = useGame();
  const msLeft = useCountdown();
  const active = state.phase === PHASE.ACTIVE;
  const urgent = active && msLeft < 15_000;
  return (
    <div className="grid min-h-0 flex-1 place-items-center rounded-lg bg-surface">
      <span
        className={`text-3xl font-black tabular-nums sm:text-4xl ${
          urgent ? 'animate-pulse text-coral' : active ? '' : 'text-ink-soft'
        }`}
      >
        {formatClock(msLeft)}
      </span>
    </div>
  );
}

/**
 * Everything above the board in one panel: played words, words per length,
 * back button, progress, score and timer.
 */
export default function GamePanel({ onBack }) {
  const { state, me, connected } = useGame();
  const words = me.roundId === state.roundId ? me.words : [];
  const score = me.roundId === state.roundId ? me.score : 0;

  const found = {};
  for (const { word } of words) {
    const len = [...word].length;
    found[len] = (found[len] || 0) + 1;
  }
  const pct = state.maxScore ? Math.min(100, (score / state.maxScore) * 100) : 0;

  return (
    <section className="grid h-56 grid-cols-[1.15fr_1fr_1.15fr] gap-2 rounded-xl bg-paper-deep p-2 sm:h-60">
      <PlayedWords words={words} />
      <LengthCounts counts={state.lengthCounts || {}} found={found} />

      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          {connected ? (
            <span className="text-[11px] font-bold text-ink-soft">{words.length} riječi</span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-black text-coral">
              <WifiOff className="size-3.5" /> offline
            </span>
          )}
          <button
            onClick={onBack}
            aria-label="Natrag na izbornik"
            title="Natrag na izbornik"
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-coral text-white shadow-[0_3px_0_0_#d9473a] transition active:translate-y-0.5 active:shadow-none"
          >
            <X className="size-5" strokeWidth={3} />
          </button>
        </div>

        <div className="relative h-4 overflow-hidden rounded-sm bg-surface" title="Udio osvojenih bodova">
          <motion.div
            className="h-full bg-gradient-to-r from-mint to-grape"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          />
          <span className="absolute inset-0 grid place-items-center text-[10px] font-black text-ink">
            {pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}%
          </span>
        </div>

        <div className="flex items-stretch overflow-hidden rounded-lg bg-surface text-sm">
          <span className="flex-1 self-center pl-2 text-xs font-bold text-ink-soft">Bodovi</span>
          <span className="grid min-w-9 place-items-center px-1.5 font-black tabular-nums">{score}</span>
          <span className="grid min-w-9 place-items-center bg-grape-soft px-1.5 text-xs font-black text-ink-soft tabular-nums">
            {state.maxScore}
          </span>
        </div>

        <Timer />
      </div>
    </section>
  );
}
