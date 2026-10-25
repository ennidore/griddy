import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Gamepad2, Loader2, LogOut, Medal, Star, Type, X } from 'lucide-react';
import Avatar from '../Avatar.jsx';
import AvatarPicker from '../AvatarPicker.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { LevelBar } from '../ui.jsx';
import { upper } from '../../lib/game.js';
import { squareImageDataUrl } from '../../lib/image.js';

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <Icon className={`mb-1 size-5 ${tint}`} />
      <div className="text-2xl font-black tabular-nums">{value ?? '–'}</div>
      <div className="text-[11px] font-bold tracking-wide text-ink-soft uppercase">{label}</div>
    </div>
  );
}

export default function ProfileSheet({ open, onClose }) {
  const { identity, updateGuest, signOut } = useAuth();
  const { updateProfile, player, emit } = useGame();
  const isUser = identity?.kind === 'user';

  const [name, setName] = useState(identity?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (open) {
      setName(identity?.name || '');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Accounts: name/avatar live on the server; usernames must stay unique.
  const saveAccount = async (patch) => {
    const res = await updateProfile(patch);
    if (!res.ok) {
      throw new Error(
        {
          username_taken: 'To korisničko ime je zauzeto.',
          inappropriate_username: 'To korisničko ime nije dopušteno. Odaberi drugo.',
          bad_username: 'Korisničko ime: 3–20 znakova (slova, brojke, _ . -).',
        }[res.reason] || 'Spremanje nije uspjelo.',
      );
    }
  };

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveName = () =>
    run(() => (isUser ? saveAccount({ name: name.trim() }) : updateGuest({ name: name.trim() })));

  const pickPreset = (preset) =>
    run(() => (isUser ? saveAccount({ avatar: preset }) : updateGuest({ avatar: preset })));

  // Own picture: cropped/resized in the browser, stored on the game server.
  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Odaberi sliku (PNG, JPG ili WebP).');
    if (file.size > 10 * 1024 * 1024) return setError('Slika smije imati najviše 10 MB.');
    run(async () => {
      const res = await emit('profile:avatar', { data: await squareImageDataUrl(file) });
      if (!res.ok) throw new Error(res.reason === 'too_large' ? 'Slika je prevelika.' : 'Učitavanje nije uspjelo.');
      if (isUser) await saveAccount({ avatar: res.url });
      else updateGuest({ avatar: res.url });
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="scroll-soft h-full w-full max-w-sm overflow-y-auto bg-surface p-6 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black">Profil</h2>
              <button onClick={onClose} className="rounded-md p-2 hover:bg-paper" aria-label="Zatvori">
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="relative">
                <button onClick={() => fileRef.current?.click()} aria-label="Učitaj vlastitu sliku" className="block">
                  <Avatar value={identity.avatar} size={88} />
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-md bg-grape text-white shadow"
                  aria-label="Učitaj vlastitu sliku"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs font-extrabold text-grape underline-offset-2 hover:underline"
              >
                Postavi vlastitu sliku
              </button>
              <span className="rounded-md bg-paper px-3 py-1 text-xs font-extrabold text-ink-soft">
                {isUser ? 'Registrirani igrač' : 'Gost'}
              </span>
            </div>

            <label className="mb-1 block text-xs font-extrabold tracking-wide text-ink-soft uppercase">
              Korisničko ime
            </label>
            <div className="mb-5 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                maxLength={20}
                className="min-w-0 flex-1 rounded-md bg-paper px-4 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-grape"
              />
              <button
                onClick={saveName}
                disabled={busy || name.trim().length < 3 || name.trim() === identity.name}
                className="rounded-md bg-grape px-4 font-extrabold text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : 'Spremi'}
              </button>
            </div>

            <label className="mb-2 block text-xs font-extrabold tracking-wide text-ink-soft uppercase">Avatar</label>
            <AvatarPicker value={identity.avatar} onChange={pickPreset} />
            {error && <p className="mt-3 text-sm font-semibold text-coral">{error}</p>}

            <h3 className="mt-7 mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Razina</h3>
            <div className="rounded-md bg-paper p-3">
              <LevelBar player={player} />
            </div>

            <h3 className="mt-6 mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Statistika</h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={Gamepad2} label="Odigrane igre" value={player?.stats.gamesPlayed} tint="text-sky" />
              <Stat icon={Star} label="Najbolja runda" value={player?.stats.highestScore} tint="text-sun" />
              <Stat icon={Type} label="Ukupno riječi" value={player?.stats.totalWords} tint="text-mint" />
              <Stat icon={Medal} label="Pobjede" value={player?.stats.wins} tint="text-coral" />
            </div>
            {player?.stats.longestWord && (
              <p className="mt-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink-soft">
                Najduža riječ: <span className="font-black text-ink">{upper(player.stats.longestWord)}</span>
              </p>
            )}
            {player?.friendCode && (
              <p className="mt-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink-soft">
                Kod za prijatelje: <span className="font-black tracking-wider text-ink">#{player.friendCode}</span>
              </p>
            )}
            {!isUser && (
              <p className="mt-2 text-xs text-ink-soft">
                Kao gost, napredak je vezan uz ovaj uređaj. Registriraj se da ga zadržiš.
              </p>
            )}

            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-md border-2 border-paper-deep py-3 font-extrabold text-ink-soft transition hover:bg-paper"
            >
              <LogOut className="size-4" /> Odjava
            </button>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
