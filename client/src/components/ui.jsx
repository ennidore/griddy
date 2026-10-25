import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Coins, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { music } from '../lib/music.js';

/** Coin balance. Pass `onClick` to make it a button (used on the home page only). */
export function CoinPill({ className = '', onClick, active = false }) {
  const { player } = useGame();
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      aria-label={onClick ? 'Kako zaraditi novčiće' : undefined}
      aria-expanded={onClick ? active : undefined}
      className={`flex items-center gap-1.5 rounded-md bg-surface py-1 pr-3 pl-1.5 text-sm font-black tabular-nums shadow-sm ${
        onClick ? 'transition active:scale-95' : ''
      } ${active ? 'ring-2 ring-sun' : ''} ${className}`}
    >
      <span className="grid size-6 place-items-center rounded-md bg-sun text-ink">
        <Coins className="size-3.5" />
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={player?.coins} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {player?.coins ?? '–'}
        </motion.span>
      </AnimatePresence>
    </Tag>
  );
}

export function LevelBadge({ level, className = '' }) {
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-md bg-grape text-xs font-black text-white ${className}`}
      title={`Razina ${level}`}
    >
      {level}
    </span>
  );
}

export function LevelBar({ player }) {
  if (!player) return null;
  const pct = Math.min(100, (player.levelXp / player.levelSize) * 100);
  return (
    <div className="flex items-center gap-2">
      <LevelBadge level={player.level} />
      <div className="flex-1">
        <div className="h-2.5 overflow-hidden rounded-sm bg-paper-deep">
          <motion.div
            className="h-full rounded-sm bg-grape"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="mt-0.5 text-[11px] font-bold text-ink-soft tabular-nums">
          {player.levelXp} / {player.levelSize} XP do razine {player.level + 1}
        </div>
      </div>
    </div>
  );
}

export function IconButton({ onClick, label, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-10 shrink-0 place-items-center rounded-md bg-surface text-ink shadow-sm transition active:scale-90 ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Sound on/off: background music and game effects (remembered per device).
 * `overlay` styles it for the answer/results panels (paper background, no shadow).
 */
export function SoundToggle({ overlay = false }) {
  const on = useSyncExternalStore(music.subscribe, music.isEnabled);
  const label = on ? 'Isključi zvuk' : 'Uključi zvuk';
  return (
    <button
      onClick={() => music.setEnabled(!on)}
      aria-label={label}
      title={label}
      aria-pressed={on}
      className={`grid size-10 shrink-0 place-items-center rounded-md text-ink transition active:scale-90 ${
        overlay ? 'bg-paper' : 'bg-surface shadow-sm'
      }`}
    >
      {on ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-ink-soft" />}
    </button>
  );
}

export function ThemeToggle() {
  const { isDark, toggleDark } = useTheme();
  return (
    <IconButton onClick={toggleDark} label={isDark ? 'Svijetla tema' : 'Tamna tema'}>
      {isDark ? <Sun className="size-5 text-sun" /> : <Moon className="size-5" />}
    </IconButton>
  );
}

/** Top bar for secondary screens: back button, title, optional right slot. */
export function ScreenHeader({ title, onBack, right }) {
  return (
    <header className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
      <IconButton onClick={onBack} label="Natrag">
        <ArrowLeft className="size-5" />
      </IconButton>
      <h1 className="flex-1 truncate text-xl font-black">{title}</h1>
      {right}
    </header>
  );
}
