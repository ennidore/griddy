import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hourglass, Loader2 } from 'lucide-react';

import Board from '../components/board/Board.jsx';
import WordPreview from '../components/board/WordPreview.jsx';
import GamePanel from '../components/GamePanel.jsx';
import JoinPrompt from '../components/phases/JoinPrompt.jsx';
import RevealModal from '../components/phases/RevealModal.jsx';
import LeaderboardChat from '../components/phases/LeaderboardChat.jsx';
import { useGame } from '../context/GameContext.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { PHASE, formatClock, toWord } from '../lib/game.js';
import { skinFor } from '../lib/cosmetics.js';
import { music } from '../lib/music.js';

function WaitingCover() {
  const { state } = useGame();
  const msLeft = useCountdown();
  const nextIn = msLeft + state.durations.revealMs + state.durations.leaderboardMs;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-paper/60 backdrop-blur-md"
    >
      <div className="text-center">
        <Hourglass className="mx-auto mb-2 size-8 animate-pulse text-grape" />
        <div className="text-lg font-black">Čekaš novu rundu</div>
        <div className="text-sm font-bold text-ink-soft tabular-nums">počinje za {formatClock(nextIn)}</div>
      </div>
    </motion.div>
  );
}

/**
 * Entry modes:
 *   prompt  – a round is running and we haven't joined it: ask join now / wait
 *   playing – on the game screen (possibly waiting for the next round)
 */
export default function GameScreen({ nav }) {
  const { state, me, player, error, submitPath, joinGame, leaveGame } = useGame();
  const [mode, setMode] = useState(null);
  const [waitRoundId, setWaitRoundId] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const latest = useRef({ state, me });
  latest.current = { state, me };
  const ready = Boolean(state);

  // On entering (once state is available): prompt or join. Leave on exit.
  // Join + leave live in one effect so StrictMode's mount/unmount/mount
  // replay ends up joined.
  useEffect(() => {
    if (!ready) return;
    const { state: st, me: progress } = latest.current;
    const alreadyIn = progress.joined && progress.roundId === st.roundId;
    if (st.phase === PHASE.ACTIVE && !alreadyIn) {
      setMode('prompt');
    } else {
      joinGame(alreadyIn);
      setMode('playing');
    }
    return () => leaveGame();
  }, [ready, joinGame, leaveGame]);

  // If the round ends while the prompt is open, there's nothing left to join.
  useEffect(() => {
    if (mode === 'prompt' && state?.phase !== PHASE.ACTIVE) {
      joinGame(false);
      setMode('playing');
    }
  }, [mode, state?.phase, joinGame]);

  const handleSubmit = useCallback(
    async (path) => {
      const res = await submitPath(path);
      if (res.reason !== 'stale') setLastResult({ ...res, id: Date.now() });
      return res;
    },
    [submitPath],
  );

  useEffect(() => {
    if (!lastResult) return;
    const t = setTimeout(() => setLastResult(null), 1600);
    return () => clearTimeout(t);
  }, [lastResult]);

  // A new round starts with a clean slate (the clear-timer above can be paused
  // while the phone screen is off or the tab is in the background).
  const roundId = state?.roundId;
  useEffect(() => setLastResult(null), [roundId]);

  // Background music: silent only while you're playing a round. It fades out
  // when the round starts and back in for the answers/results and the menu.
  const playingRound =
    mode === 'playing' && state?.phase === PHASE.ACTIVE && me.joined && me.roundId === state?.roundId;
  useEffect(() => music.setInRound(playingRound), [playingRound]);
  useEffect(() => () => music.setInRound(false), []);

  if (!state) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-grape" />
          <p className="font-bold text-ink-soft">{error ? `Greška: ${error}` : 'Spajanje na igru…'}</p>
        </div>
      </div>
    );
  }

  const active = state.phase === PHASE.ACTIVE;
  const waiting = active && waitRoundId === state.roundId;
  const canPlay = active && me.joined && me.roundId === state.roundId;
  const currentWord = currentPath.length ? toWord(state.board, currentPath) : '';

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[500px] flex-col px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
      <GamePanel onBack={nav.back} />

      <main className="flex-1">
        <WordPreview
          key={state.roundId}
          currentWord={currentWord}
          result={lastResult?.roundId === state.roundId ? lastResult : null}
        />
        <div className="relative">
          <Board
            board={state.board}
            size={state.gridSize}
            roundId={state.roundId}
            disabled={!canPlay}
            skin={skinFor(player?.equipped?.tile)}
            onSubmit={handleSubmit}
            onPathChange={setCurrentPath}
          />
          {(waiting || mode === 'prompt') && <WaitingCover />}
        </div>
      </main>

      <AnimatePresence>
        {mode === 'prompt' && active && (
          <JoinPrompt
            key="join"
            onJoinNow={() => {
              joinGame(true);
              setMode('playing');
            }}
            onWait={() => {
              joinGame(false);
              setWaitRoundId(state.roundId);
              setMode('playing');
            }}
            onBack={nav.back}
          />
        )}
        {mode === 'playing' && state.phase === PHASE.REVEAL && <RevealModal key={`reveal-${state.roundId}`} onBack={nav.back} />}
        {mode === 'playing' && state.phase === PHASE.LEADERBOARD && <LeaderboardChat key={`lb-${state.roundId}`} onBack={nav.back} />}
      </AnimatePresence>
    </div>
  );
}
