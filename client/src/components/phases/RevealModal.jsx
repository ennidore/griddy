import { useMemo, useState } from 'react';
import { Check, Eye } from 'lucide-react';
import Overlay, { OverlayBack } from './Overlay.jsx';
import { SoundToggle } from '../ui.jsx';
import PhaseCountdown from './PhaseCountdown.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { upper } from '../../lib/game.js';

/** Small board with the selected word's path drawn over it. */
function PathBoard({ board, size, path }) {
  const cell = 100 / size;
  const center = (i) => [((i % size) + 0.5) * cell, (Math.floor(i / size) + 0.5) * cell];
  return (
    <div className="relative mx-auto aspect-square w-44 shrink-0">
      <div className="grid h-full gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {board.map((l, i) => {
          const order = path.indexOf(i);
          return (
            <div
              key={i}
              className={`grid place-items-center rounded-md text-base font-black transition-colors ${
                order === 0 ? 'bg-grape-deep text-white' : order > 0 ? 'bg-grape text-white' : 'bg-paper text-ink-soft'
              }`}
            >
              {upper(l)}
            </div>
          );
        })}
      </div>
      {path.length > 1 && (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
          <polyline
            points={path.map((i) => center(i).join(',')).join(' ')}
            fill="none"
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * Answer reveal: summary, a board showing the selected word's path, and every
 * valid word grouped by length (tap a word to see where it was).
 */
export default function RevealModal({ onBack }) {
  const { state, me } = useGame();
  const solutions = state.solutions || [];
  const foundSet = useMemo(
    () => new Set(me.roundId === state.roundId ? me.words.map((w) => w.word) : []),
    [me.words, me.roundId, state.roundId],
  );
  // Solutions arrive sorted longest/highest first, so [0] is the best word.
  const [selectedWord, setSelectedWord] = useState(null);
  const selected = solutions.find((s) => s.word === selectedWord) || solutions[0] || null;

  const groups = useMemo(() => {
    const map = new Map();
    for (const s of solutions) {
      const len = [...s.word].length;
      if (!map.has(len)) map.set(len, []);
      map.get(len).push(s);
    }
    return [...map].sort((a, b) => b[0] - a[0]);
  }, [solutions]);

  return (
    <Overlay size="sm">
      <div className="flex items-center gap-3 border-b border-paper-deep px-4 py-3">
        <OverlayBack onClick={onBack} />
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-black">
          <Eye className="size-5 shrink-0 text-grape" /> Rješenja
        </h2>
        <PhaseCountdown label="Rezultati za" />
        <SoundToggle overlay />
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <div className="rounded-md bg-paper px-3 py-2">
          <div className="text-[10px] font-extrabold tracking-wide text-ink-soft uppercase">Riječi</div>
          <div className="text-lg font-black tabular-nums">
            {foundSet.size}
            <span className="text-sm text-ink-soft"> / {solutions.length}</span>
          </div>
        </div>
        <div className="rounded-md bg-paper px-3 py-2">
          <div className="text-[10px] font-extrabold tracking-wide text-ink-soft uppercase">Bodovi</div>
          <div className="text-lg font-black tabular-nums">
            {me.roundId === state.roundId ? me.score : 0}
            <span className="text-sm text-ink-soft"> / {state.maxScore}</span>
          </div>
        </div>
      </div>

      {selected && (
        <div className="flex flex-col items-center gap-2 px-4 pt-4">
          <PathBoard board={state.board} size={state.gridSize} path={selected.path} />
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-[0.1em]">{upper(selected.word)}</span>
            <span className="text-sm font-bold text-ink-soft">+{selected.points}</span>
            {foundSet.has(selected.word) && <Check className="size-4 self-center text-mint" />}
          </div>
        </div>
      )}

      <div className="scroll-soft min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-4">
        {groups.length === 0 && <p className="text-sm text-ink-soft">Na ovoj ploči nema riječi iz rječnika.</p>}
        {groups.map(([len, words]) => (
          <div key={len}>
            <h3 className="mb-1.5 text-[11px] font-extrabold tracking-wide text-ink-soft uppercase">
              {len} slova · {words[0].points} bod. ·{' '}
              {words.filter((w) => foundSet.has(w.word)).length}/{words.length}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {words.map((s) => {
                const found = foundSet.has(s.word);
                const isSel = selected?.word === s.word;
                return (
                  <button
                    key={s.word}
                    onClick={() => setSelectedWord(s.word)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold transition ${
                      found ? 'bg-mint/15 text-mint' : 'bg-paper text-ink-soft'
                    } ${isSel ? 'outline-2 outline-offset-1 outline-grape' : ''}`}
                  >
                    {found && <Check className="size-3.5" />}
                    {upper(s.word)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Overlay>
  );
}
