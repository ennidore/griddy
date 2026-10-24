import { motion } from 'framer-motion';
import { upper } from '../../lib/game.js';

// Result flashes use fixed semantic colours regardless of the tile skin.
const FLASH = {
  ok: { background: '#22c39d', color: '#fff', edge: '#169677' },
  dup: { background: '#ffc23d', color: '#1d2230', edge: '#d99a12' },
  bad: { background: '#ff6a5c', color: '#fff', edge: '#d9473a' },
};

function look(status) {
  if (FLASH[status]) return FLASH[status];
  if (status === 'selected') {
    return { background: 'var(--tile-sel-bg)', color: 'var(--tile-sel-fg)', edge: 'var(--tile-sel-edge)' };
  }
  return { background: 'var(--tile-bg)', color: 'var(--tile-fg)', edge: 'var(--tile-edge)', glow: 'var(--tile-glow)' };
}

/**
 * Outer element: one-shot entrance animation (staggered pop-in per new board).
 * Inner element: selection state via CSS transitions. Colours come from the
 * tile-skin CSS variables set on the board (see lib/cosmetics.js).
 */
export default function Tile({ ref, letter, index, status = 'idle', size = 'lg' }) {
  const l = look(status);
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, delay: index * 0.025 }}
      className="aspect-square w-full"
    >
      <div
        style={{ background: l.background, color: l.color, boxShadow: `0 3px 0 0 ${l.edge}`, textShadow: l.glow }}
        className={`flex h-full w-full items-center justify-center rounded-[12%] transition-[scale,box-shadow,color] duration-150 select-none ${
          status === 'selected' ? 'scale-107' : ''
        }`}
      >
        <span
          className={`leading-none font-black ${
            size === 'lg' ? 'text-[clamp(1.75rem,9vw,2.75rem)]' : 'text-xl'
          }`}
        >
          {upper(letter)}
        </span>
      </div>
    </motion.div>
  );
}

/** CSS variables for a skin, to spread into a container's style. */
export const skinStyle = (skin) => ({
  '--tile-bg': skin.bg,
  '--tile-fg': skin.fg,
  '--tile-edge': skin.edge,
  '--tile-glow': skin.glow || 'none',
  '--tile-sel-bg': skin.selBg,
  '--tile-sel-fg': skin.selFg,
  '--tile-sel-edge': skin.selEdge,
});
