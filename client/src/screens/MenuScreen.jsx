import { motion } from 'framer-motion';
import { Palette, Pencil, Play, Trophy, Users } from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import CoinInfo from '../components/CoinInfo.jsx';
import { LevelBar, ThemeToggle } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useGame } from '../context/GameContext.jsx';
import { useSocial } from '../context/SocialContext.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { PHASE, formatClock } from '../lib/game.js';

function RoundStatus() {
  const { state, playing } = useGame();
  const msLeft = useCountdown();
  if (!state) return <span>Spajanje…</span>;
  if (state.phase === PHASE.ACTIVE) {
    return (
      <span>
        Runda u tijeku · {formatClock(msLeft)} · {playing} u igri
      </span>
    );
  }
  const untilNext = msLeft + (state.phase === PHASE.REVEAL ? state.durations.leaderboardMs : 0);
  return <span>Nova runda za {Math.ceil(untilNext / 1000)} s</span>;
}

function IconTile({ icon: Icon, label, badge, tint, onClick, delay }) {
  return (
    <motion.button
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      onClick={onClick}
      aria-label={label}
      className="relative flex flex-col items-center gap-2 rounded-lg bg-surface px-2 py-4 shadow-sm transition active:scale-[0.97]"
    >
      <span className={`grid size-12 place-items-center rounded-md ${tint}`}>
        <Icon className="size-6" />
      </span>
      <span className="text-sm font-black">{label}</span>
      {badge > 0 && (
        <span className="absolute top-2 right-2 grid min-w-6 place-items-center rounded-md bg-coral px-1.5 py-0.5 text-xs font-black text-white">
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export default function MenuScreen({ nav }) {
  const { identity } = useAuth();
  const { player, online, connected } = useGame();
  const { badgeCount } = useSocial();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <header className="flex items-center justify-between py-1">
        <h1 className="text-3xl font-black tracking-tight">
          Grid<span className="text-grape">dy</span>
        </h1>
        <div className="flex items-center gap-2">
          <CoinInfo />
          <ThemeToggle />
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={nav.openProfile}
            aria-label="Otvori profil"
            title="Profil"
            className="group relative shrink-0 rounded-md transition active:scale-95"
          >
            <Avatar value={identity.avatar} size={56} />
            <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-md border-2 border-surface bg-grape text-white">
              <Pencil className="size-3" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black">{identity.name}</div>
            <div className="text-xs font-bold text-ink-soft">
              {identity.kind === 'guest' ? 'Gost' : 'Registrirani igrač'} ·{' '}
              {connected ? `${online} online` : 'offline'}
            </div>
          </div>
        </div>
        <LevelBar player={player} />
      </section>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => nav.go('game')}
        className="relative overflow-hidden rounded-xl bg-grape p-6 text-left text-white shadow-[0_6px_0_0_var(--color-grape-deep)]"
      >
        <div className="absolute -top-6 -right-4 grid grid-cols-2 gap-2 opacity-20" aria-hidden>
          {['Č', 'A', 'Š', 'Ž'].map((l) => (
            <span key={l} className="grid size-16 place-items-center rounded-md bg-white text-3xl font-black text-grape">
              {l}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-2 text-3xl font-black">
          <Play className="size-7 fill-current" /> Igraj
        </span>
        <span className="mt-1 block text-sm font-bold opacity-85">
          <RoundStatus />
        </span>
      </motion.button>

      <div className="grid grid-cols-3 gap-2.5">
        <IconTile
          icon={Users}
          label="Prijatelji"
          badge={badgeCount}
          tint="bg-sky/15 text-sky"
          onClick={() => nav.go('friends')}
          delay={0.05}
        />
        <IconTile
          icon={Palette}
          label="Prilagodi"
          tint="bg-coral/15 text-coral"
          onClick={() => nav.go('customize')}
          delay={0.1}
        />
        <IconTile
          icon={Trophy}
          label="Ljestvica"
          tint="bg-sun/20 text-sun"
          onClick={() => nav.go('leaderboard')}
          delay={0.15}
        />
      </div>
    </div>
  );
}
