import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Ghost, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import AvatarPicker from '../AvatarPicker.jsx';
import { DEFAULT_AVATAR } from '../../lib/avatars.js';

const DEMO_LETTERS = ['G', 'R', 'I', 'D', 'D', 'Y'];
const inputClass =
  'w-full rounded-md bg-paper px-4 py-3 font-semibold outline-none placeholder:text-ink-soft/60 focus:ring-2 focus:ring-grape';

const ERRORS = {
  bad_username: 'Korisničko ime: 3–20 znakova (slova, brojke, _ . -).',
  bad_password: 'Lozinka mora imati barem 6 znakova.',
  username_taken: 'To korisničko ime je zauzeto.',
  inappropriate_username: 'To korisničko ime nije dopušteno. Odaberi drugo.',
  wrong_credentials: 'Pogrešno korisničko ime ili lozinka.',
  rate_limited: 'Previše pokušaja. Pričekaj minutu.',
  mismatch: 'Lozinke se ne podudaraju.',
};

const TABS = [
  { id: 'login', label: 'Prijava', icon: LogIn },
  { id: 'register', label: 'Registracija', icon: UserPlus },
  { id: 'guest', label: 'Gost', icon: Ghost },
];

export default function AuthScreen() {
  const { signIn, signUp, playAsGuest } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', confirm: '', guestName: '', avatar: DEFAULT_AVATAR });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchTab = (id) => {
    setTab(id);
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (tab === 'guest') return playAsGuest(form.guestName.trim() || 'Gost', form.avatar);
    if (tab === 'register' && form.password !== form.confirm) return setError(ERRORS.mismatch);

    setBusy(true);
    try {
      if (tab === 'login') await signIn(form.username.trim(), form.password);
      else await signUp(form.username.trim(), form.password);
    } catch (err) {
      setError(ERRORS[err.code] || 'Nema veze sa serverom. Pokušaj ponovno.');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center gap-1.5">
          {DEMO_LETTERS.map((l, i) => (
            <motion.div
              key={i}
              initial={{ y: -30, opacity: 0, rotate: -10 }}
              animate={{ y: 0, opacity: 1, rotate: i % 2 ? 2 : -2 }}
              transition={{ type: 'spring', delay: i * 0.06 }}
              className={`grid size-10 place-items-center rounded-md text-xl font-black shadow-[0_4px_0_0_var(--color-line)] sm:size-12 sm:text-2xl ${
                i === 0 ? 'bg-grape text-white' : 'bg-surface'
              }`}
            >
              {l}
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-xl shadow-ink/5">
          <div className="mb-5 flex rounded-md bg-paper p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-extrabold transition ${
                  tab === id ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft'
                }`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {tab === 'guest' ? (
              <>
                <input
                  className={inputClass}
                  placeholder="Nadimak"
                  maxLength={20}
                  value={form.guestName}
                  onChange={set('guestName')}
                />
                <AvatarPicker value={form.avatar} onChange={(avatar) => setForm((f) => ({ ...f, avatar }))} />
                <p className="text-xs text-ink-soft">
                  Kao gost, razina, novčići i prijatelji spremaju se samo u ovom pregledniku.
                </p>
              </>
            ) : (
              <>
                <input
                  className={inputClass}
                  placeholder="Korisničko ime"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={20}
                  required
                  value={form.username}
                  onChange={set('username')}
                />
                <div className="relative">
                  <input
                    className={`${inputClass} pr-12`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Lozinka"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    minLength={tab === 'register' ? 6 : undefined}
                    maxLength={100}
                    required
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-soft"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {tab === 'register' && (
                  <>
                    <input
                      className={inputClass}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ponovi lozinku"
                      autoComplete="new-password"
                      maxLength={100}
                      required
                      value={form.confirm}
                      onChange={set('confirm')}
                    />
                    <p className="text-xs text-ink-soft">
                      Korisničko ime: 3–20 znakova. Lozinka: barem 6 znakova. Napredak se sprema na tvoj račun.
                    </p>
                  </>
                )}
              </>
            )}

            {error && <p className="text-sm font-semibold text-coral">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-grape py-3 font-black text-white shadow-[0_4px_0_0_var(--color-grape-deep)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {tab === 'login' ? 'Prijavi se' : tab === 'register' ? 'Stvori račun' : 'Igraj kao gost'}
            </button>
          </form>
        </div>

        {/* Word-list attribution (CC BY-SA 4.0 requires credit) */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-soft">
          Griddy v{__APP_VERSION__} · Rječnik:{' '}
          <a
            href="https://github.com/hermitdave/FrequencyWords"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            FrequencyWords
          </a>{' '}
          (CC BY-SA 4.0) i{' '}
          <a
            href="https://github.com/LibreOffice/dictionaries"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            hunspell-hr
          </a>
        </p>
      </div>
    </div>
  );
}
