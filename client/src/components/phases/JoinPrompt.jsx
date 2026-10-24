import { Clock, Zap } from 'lucide-react';
import Overlay from './Overlay.jsx';
import { useCountdown } from '../../hooks/useCountdown.js';
import { useGame } from '../../context/GameContext.jsx';
import { formatClock } from '../../lib/game.js';

/** Shown when opening the game while a round is already running. */
export default function JoinPrompt({ onJoinNow, onWait, onBack }) {
  const { state } = useGame();
  const msLeft = useCountdown();
  const nextIn = msLeft + state.durations.revealMs + state.durations.leaderboardMs;

  return (
    <Overlay>
      <div className="p-6 text-center">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-md bg-grape-soft text-grape">
          <Clock className="size-7" />
        </div>
        <h2 className="text-2xl font-black">Runda je u tijeku</h2>
        <p className="mt-1 font-bold text-ink-soft">
          Još {formatClock(msLeft)} · {state.players} {state.players === 1 ? 'igrač' : 'igrača'} · {state.totalWords}{' '}
          riječi na ploči
        </p>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          <button
            onClick={onJoinNow}
            className="flex items-center justify-center gap-2 rounded-md bg-grape py-3.5 font-black text-white shadow-[0_4px_0_0_var(--color-grape-deep)] transition active:translate-y-0.5 active:shadow-none"
          >
            <Zap className="size-5" /> Uđi odmah
          </button>
          <button
            onClick={onWait}
            className="flex items-center justify-center gap-2 rounded-md bg-paper py-3.5 font-black transition active:scale-[0.98]"
          >
            <Clock className="size-5" /> Čekaj novu ({formatClock(nextIn)})
          </button>
        </div>
        <button onClick={onBack} className="mt-4 text-sm font-bold text-ink-soft underline-offset-2 hover:underline">
          Natrag na izbornik
        </button>
      </div>
    </Overlay>
  );
}
