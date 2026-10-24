import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import { LevelBadge, ScreenHeader } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useGame } from '../context/GameContext.jsx';
import { plural } from '../lib/game.js';

const TABS = [
  { id: 'score', label: 'Najbolja runda', value: (p) => p.highestScore, unit: 'bod.' },
  { id: 'wins', label: 'Pobjede', value: (p) => p.wins, unit: '' },
  { id: 'level', label: 'Razina', value: (p) => p.level, unit: '' },
  { id: 'words', label: 'Riječi', value: (p) => p.totalWords, unit: '' },
];

const MEDAL = { 0: 'bg-sun text-ink', 1: 'bg-[#d9dde6] text-ink', 2: 'bg-[#f2c3a0] text-ink' };

/** All-time rankings across every player who has finished a round. */
export default function LeaderboardScreen({ nav }) {
  const { identity } = useAuth();
  const { emit, connected } = useGame();
  const [tab, setTab] = useState('score');
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    if (!connected) return;
    let alive = true;
    setPlayers(null);
    emit('leaderboard:top', { by: tab }).then((res) => alive && setPlayers(res.players || []));
    return () => {
      alive = false;
    };
  }, [tab, connected, emit]);

  const current = TABS.find((t) => t.id === tab);

  return (
    <div className="mx-auto min-h-full max-w-xl pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <ScreenHeader title="Ljestvica" onBack={nav.back} />

      <div className="space-y-4 px-4">
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-1 py-2 text-xs font-extrabold transition sm:text-sm ${
                tab === t.id ? 'bg-grape text-white' : 'text-ink-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {players === null ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-7 animate-spin text-grape" />
          </div>
        ) : players.length === 0 ? (
          <p className="rounded-lg bg-surface p-4 text-sm text-ink-soft shadow-sm">
            Još nitko nije odigrao rundu. Budi prvi!
          </p>
        ) : (
          <ol className="space-y-1.5">
            {players.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.025 }}
                className={`flex items-center gap-3 rounded-lg p-2.5 shadow-sm ${
                  p.id === identity.id ? 'bg-grape-soft' : 'bg-surface'
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-md text-sm font-black ${
                    MEDAL[i] || 'bg-paper text-ink-soft'
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar value={p.avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-black">{p.name}</span>
                    <LevelBadge level={p.level} className="size-5 text-[10px]" />
                  </div>
                  <div className="text-xs font-bold text-ink-soft">
                    {p.gamesPlayed} {plural(p.gamesPlayed, 'runda', 'runde', 'rundi')} · {p.wins}{' '}
                    {plural(p.wins, 'pobjeda', 'pobjede', 'pobjeda')}
                  </div>
                </div>
                <span className="text-lg font-black tabular-nums">
                  {current.value(p)}
                  {current.unit && <span className="ml-1 text-xs text-ink-soft">{current.unit}</span>}
                </span>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
