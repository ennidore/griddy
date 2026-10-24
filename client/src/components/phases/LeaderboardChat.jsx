import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Coins, Crown, MessageCircle, Trophy, UserPlus } from 'lucide-react';
import Overlay, { OverlayBack } from './Overlay.jsx';
import PhaseCountdown from './PhaseCountdown.jsx';
import Chat from './Chat.jsx';
import Avatar from '../Avatar.jsx';
import { REWARD_LABELS } from '../RewardToast.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { useSocial } from '../../context/SocialContext.jsx';
import { upper } from '../../lib/game.js';

const MEDAL = { 1: 'bg-sun text-ink', 2: 'bg-[#d9dde6] text-ink', 3: 'bg-[#f2c3a0] text-ink' };

function AddFriendButton({ playerId }) {
  const { isFriend, isPending, sendRequest } = useSocial();
  const [sent, setSent] = useState(false);
  if (isFriend(playerId)) return null;
  const done = sent || isPending(playerId);
  return (
    <button
      onClick={async () => {
        const res = await sendRequest({ playerId });
        if (res.ok || res.reason === 'already_requested') setSent(true);
      }}
      disabled={done}
      title={done ? 'Zahtjev poslan' : 'Dodaj prijatelja'}
      className="grid size-8 shrink-0 place-items-center rounded-md bg-surface text-ink-soft transition hover:text-grape active:scale-90"
    >
      {done ? <Check className="size-4 text-mint" /> : <UserPlus className="size-4" />}
    </button>
  );
}

export default function LeaderboardChat({ onBack }) {
  const { state } = useGame();
  const { identity } = useAuth();
  const rankings = state.rankings || [];
  const mine = rankings.find((p) => p.id === identity.id);

  return (
    <Overlay>
      <div className="flex items-center gap-3 border-b border-paper-deep px-6 py-4">
        <OverlayBack onClick={onBack} />
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-xl font-black">
          <Trophy className="size-5 text-sun" /> Rezultati runde
        </h2>
        <PhaseCountdown label="Nova runda za" />
      </div>

      {mine?.rewards?.coins > 0 || mine?.rewards?.xp > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-paper-deep bg-grape-soft/60 px-6 py-2.5 text-sm font-bold">
          <span>Zaradio/la si:</span>
          <span className="flex items-center gap-1 font-black">
            <Coins className="size-4 text-sun" /> +{mine.rewards.coins}
          </span>
          <span className="font-black text-grape">+{mine.rewards.xp} XP</span>
          {mine.rewards.breakdown.length > 0 && (
            <span className="text-ink-soft">({mine.rewards.breakdown.map((b) => REWARD_LABELS[b.reason]).join(', ')})</span>
          )}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-5 p-6 sm:grid-cols-2">
        <ol className="scroll-soft max-h-[38dvh] space-y-1.5 overflow-y-auto pr-1 sm:max-h-none">
          {rankings.length === 0 && <li className="text-sm text-ink-soft">Nitko nije igrao ovu rundu.</li>}
          {rankings.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                p.id === identity.id ? 'bg-grape-soft' : 'bg-paper'
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-md text-sm font-black ${MEDAL[p.rank] || 'bg-surface'}`}
              >
                {p.rank}
              </span>
              <Avatar value={p.avatar} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate font-extrabold">
                  {p.name}
                  {p.won && <Crown className="size-4 shrink-0 text-sun" />}
                </div>
                <div className="truncate text-xs font-bold text-ink-soft">
                  {p.wordCount} riječi{p.bestWord ? ` · najduža ${upper(p.bestWord)}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg leading-tight font-black tabular-nums">{p.score}</div>
                {p.rewards?.coins > 0 && (
                  <div className="flex items-center justify-end gap-0.5 text-[11px] font-black text-ink-soft">
                    <Coins className="size-3 text-sun" />+{p.rewards.coins}
                  </div>
                )}
              </div>
              {p.id !== identity.id && <AddFriendButton playerId={p.id} />}
            </motion.li>
          ))}
        </ol>

        <div className="flex min-h-[260px] flex-col rounded-lg border border-paper-deep p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
            <MessageCircle className="size-4" /> Razgovor
          </h3>
          <Chat className="flex-1" />
        </div>
      </div>
    </Overlay>
  );
}
