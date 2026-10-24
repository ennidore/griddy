import { useState } from 'react';
import { Check, Coins, Laptop, Lock, Moon, Sun } from 'lucide-react';
import Tile, { skinStyle } from '../components/board/Tile.jsx';
import { CoinPill, ScreenHeader } from '../components/ui.jsx';
import { useGame } from '../context/GameContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { BACKGROUNDS, skinFor } from '../lib/cosmetics.js';

const SHOP_ERRORS = {
  not_enough_coins: 'Nemaš dovoljno novčića.',
  level_too_low: 'Potrebna je viša razina.',
  already_owned: 'Već imaš ove pločice.',
  offline: 'Nema veze sa serverom.',
};

function Section({ title, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="px-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">{title}</h2>
      {children}
    </section>
  );
}

function ModeSwitch() {
  const { prefs, update } = useTheme();
  const options = [
    { id: 'light', label: 'Svijetla', icon: Sun },
    { id: 'dark', label: 'Tamna', icon: Moon },
    { id: 'system', label: 'Sustav', icon: Laptop },
  ];
  return (
    <div className="flex rounded-md bg-surface p-1 shadow-sm">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => update({ mode: id })}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-extrabold transition ${
            prefs.mode === id ? 'bg-grape text-white shadow-sm' : 'text-ink-soft'
          }`}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}

function BackgroundCard({ bg, selected, onSelect }) {
  const [paper, surface, accent] = bg.swatch;
  return (
    <button
      onClick={onSelect}
      className={`relative overflow-hidden rounded-lg p-1 transition active:scale-[0.98] ${
        selected ? 'ring-3 ring-grape' : 'ring-1 ring-line'
      }`}
    >
      <div className="flex h-20 flex-col justify-between rounded-lg p-2.5" style={{ background: paper }}>
        <div className="flex gap-1">
          <span className="h-2.5 w-8 rounded-sm" style={{ background: surface }} />
          <span className="h-2.5 w-4 rounded-sm" style={{ background: accent }} />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-5 rounded-sm" style={{ background: i === 1 ? accent : surface }} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm font-black">{bg.name}</span>
        {selected && <Check className="size-4 text-grape" />}
      </div>
    </button>
  );
}

function TileCard({ item, player, onBuy, onEquip, busy }) {
  const owned = player.owned.includes(item.id);
  const equipped = player.equipped.tile === item.id;
  const locked = !owned && player.level < item.minLevel;
  const affordable = player.coins >= item.price;

  let action;
  if (equipped) {
    action = (
      <span className="flex items-center justify-center gap-1 rounded-md bg-mint/15 py-2 text-sm font-black text-mint">
        <Check className="size-4" /> Odabrano
      </span>
    );
  } else if (owned) {
    action = (
      <button onClick={onEquip} disabled={busy} className="rounded-md bg-paper py-2 text-sm font-black transition active:scale-95">
        Odaberi
      </button>
    );
  } else if (locked) {
    action = (
      <span className="flex items-center justify-center gap-1 rounded-md bg-paper py-2 text-sm font-black text-ink-soft">
        <Lock className="size-4" /> Razina {item.minLevel}
      </span>
    );
  } else {
    action = (
      <button
        onClick={onBuy}
        disabled={busy || !affordable}
        className="flex items-center justify-center gap-1 rounded-md bg-sun py-2 text-sm font-black text-ink transition active:scale-95 disabled:opacity-45"
      >
        <Coins className="size-4" /> {item.price}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg bg-surface p-3 shadow-sm ${equipped ? 'ring-3 ring-grape' : ''} ${
        locked ? 'opacity-70' : ''
      }`}
    >
      <div
        className="grid grid-cols-2 gap-2 rounded-md bg-paper-deep p-2.5"
        style={skinStyle(skinFor(item.id))}
      >
        {['Č', 'A', 'Š', 'Ž'].map((l, i) => (
          <Tile key={l} letter={l} index={i} size="sm" status={i === 1 ? 'selected' : 'idle'} />
        ))}
      </div>
      <div className="px-1 text-sm font-black">{item.name}</div>
      {action}
    </div>
  );
}

export default function CustomizeScreen({ nav }) {
  const { prefs, update } = useTheme();
  const { player, catalog, buyItem, equipItem } = useGame();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const run = async (fn) => {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setMessage(SHOP_ERRORS[res.reason] || 'Nešto nije u redu.');
    return res;
  };

  const buy = (item) =>
    run(async () => {
      const res = await buyItem(item.id);
      if (res.ok) await equipItem(item.id);
      return res;
    });

  return (
    <div className="mx-auto min-h-full max-w-2xl pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <ScreenHeader title="Prilagodi" onBack={nav.back} right={<CoinPill />} />

      <div className="space-y-6 px-4">
        <Section title="Tema">
          <ModeSwitch />
        </Section>

        {/* Only the backgrounds for the chosen mode; both when following the system. */}
        {prefs.mode !== 'dark' && (
          <Section title="Svijetle pozadine">
            <div className="grid grid-cols-3 gap-2.5">
              {BACKGROUNDS.light.map((bg) => (
                <BackgroundCard
                  key={bg.id}
                  bg={bg}
                  selected={prefs.lightBg === bg.id}
                  onSelect={() => update({ lightBg: bg.id })}
                />
              ))}
            </div>
          </Section>
        )}

        {prefs.mode !== 'light' && (
          <Section title="Tamne pozadine">
            <div className="grid grid-cols-3 gap-2.5">
              {BACKGROUNDS.dark.map((bg) => (
                <BackgroundCard
                  key={bg.id}
                  bg={bg}
                  selected={prefs.darkBg === bg.id}
                  onSelect={() => update({ darkBg: bg.id })}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="Pločice">
          {message && <p className="px-1 text-sm font-bold text-coral">{message}</p>}
          {player ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {catalog.tiles.map((item) => (
                <TileCard
                  key={item.id}
                  item={item}
                  player={player}
                  busy={busy}
                  onBuy={() => buy(item)}
                  onEquip={() => run(() => equipItem(item.id))}
                />
              ))}
            </div>
          ) : (
            <p className="px-1 text-sm text-ink-soft">Spajanje…</p>
          )}
        </Section>
      </div>
    </div>
  );
}
