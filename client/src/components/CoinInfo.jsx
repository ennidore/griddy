import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsUp, Coins, Medal, Trophy, WholeWord } from 'lucide-react';
import { CoinPill } from './ui.jsx';
import { useGame } from '../context/GameContext.jsx';

/**
 * Home-page coin balance that opens a short explanation of how coins are
 * earned. Values come from the server (`catalog.coinRules`).
 */
export default function CoinInfo() {
  const { catalog } = useGame();
  const rules = catalog.coinRules;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const rows = rules
    ? [
        { icon: Trophy, tint: 'text-sun', label: 'Pobjeda u rundi', coins: rules.win },
        { icon: Medal, tint: 'text-sky', label: 'Plasman u top 10', coins: rules.top10 },
        { icon: WholeWord, tint: 'text-mint', label: 'Najduža riječ u rundi', coins: rules.longestWord, extra: true },
        { icon: ChevronsUp, tint: 'text-grape', label: 'Nova razina', coins: rules.levelUp },
      ]
    : [];

  return (
    <div className="relative">
      <CoinPill onClick={() => setOpen((o) => !o)} active={open} />
      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Zatvori"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Kako zaraditi novčiće"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 z-40 mt-2 w-72 origin-top-right rounded-lg bg-surface p-4 shadow-xl ring-1 ring-line"
            >
              <h2 className="mb-3 flex items-center gap-2 font-black">
                <span className="grid size-6 place-items-center rounded-md bg-sun text-ink">
                  <Coins className="size-3.5" />
                </span>
                Kako zaraditi novčiće
              </h2>
              <ul className="space-y-2">
                {rows.map(({ icon: Icon, tint, label, coins, extra }) => (
                  <li key={label} className="flex items-center gap-3 rounded-md bg-paper px-3 py-2">
                    <Icon className={`size-4 shrink-0 ${tint}`} />
                    <span className="flex-1 text-sm font-bold">
                      {label}
                      {extra && <span className="block text-[11px] font-bold text-ink-soft">dodatno, uz plasman</span>}
                    </span>
                    <span className="flex items-center gap-1 font-black tabular-nums">
                      +{coins}
                      <Coins className="size-3.5 text-sun" />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                Pobjeda zamjenjuje nagradu za top 10. Nagrade dobivaš samo ako u rundi pronađeš barem jednu
                riječ. Novčiće trošiš na pločice u izborniku Prilagodi.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
