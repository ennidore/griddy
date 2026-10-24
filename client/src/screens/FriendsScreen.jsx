import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Search, UserPlus, X } from 'lucide-react';
import Avatar, { PresenceAvatar } from '../components/Avatar.jsx';
import DirectChat from '../components/friends/DirectChat.jsx';
import { LevelBadge, ScreenHeader } from '../components/ui.jsx';
import { useGame } from '../context/GameContext.jsx';
import { useSocial } from '../context/SocialContext.jsx';

const REQUEST_MESSAGES = {
  not_found: 'Nema igrača s tim kodom.',
  self: 'To je tvoj kod 🙂',
  already_friends: 'Već ste prijatelji.',
  already_requested: 'Zahtjev je već poslan.',
  offline: 'Nema veze sa serverom.',
};

const CODE_RE = /^#?[A-HJ-NP-Z2-9]{6}$/i;

const RELATION_LABEL = { accepted: 'Prijatelj', outgoing: 'Poslano', incoming: 'Čeka tebe' };

function AddFriend() {
  const { player, emit } = useGame();
  const { sendRequest } = useSocial();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Live username search (debounced). Code-shaped input is handled on submit.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || q.startsWith('#')) return setResults(null);
    const t = setTimeout(async () => {
      const res = await emit('friends:search', { query: q });
      setResults(res.results || []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, emit]);

  const report = (res) => {
    if (res.ok) {
      setMsg({
        ok: true,
        text: res.status === 'accepted' ? `Ti i ${res.name} ste sada prijatelji!` : `Zahtjev poslan igraču ${res.name}.`,
      });
    } else setMsg({ ok: false, text: REQUEST_MESSAGES[res.reason] || 'Nešto nije u redu.' });
    return res;
  };

  const addById = async (p) => {
    const res = report(await sendRequest({ playerId: p.id }));
    if (res.ok) {
      setResults((list) =>
        list?.map((r) => (r.id === p.id ? { ...r, relation: res.status === 'accepted' ? 'accepted' : 'outgoing' } : r)),
      );
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (CODE_RE.test(q)) {
      const res = await sendRequest({ code: q });
      if (res.ok || res.reason !== 'not_found' || q.startsWith('#')) {
        report(res);
        if (res.ok) setQuery('');
        return;
      }
    }
    // Not a known code: if exactly one username matches, add them directly.
    const res = await emit('friends:search', { query: q });
    const list = res.results || [];
    setResults(list);
    const exact = list.filter((p) => p.name.toLocaleLowerCase('hr') === q.toLocaleLowerCase('hr') && !p.relation);
    if (exact.length === 1) addById(exact[0]);
    else if (!list.length) setMsg({ ok: false, text: 'Nema igrača s tim imenom ili kodom.' });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`#${player.friendCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="space-y-3 rounded-lg bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Tvoj kod</div>
          <div className="text-2xl font-black tracking-widest">#{player?.friendCode ?? '······'}</div>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md bg-paper px-3 py-2 text-sm font-black transition active:scale-95"
        >
          {copied ? <Check className="size-4 text-mint" /> : <Copy className="size-4" />}
          {copied ? 'Kopirano' : 'Kopiraj'}
        </button>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-paper px-3 focus-within:ring-2 focus-within:ring-grape">
          <Search className="size-4 shrink-0 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setMsg(null);
            }}
            maxLength={20}
            placeholder="Korisničko ime ili #kod"
            className="min-w-0 flex-1 bg-transparent py-2.5 font-bold outline-none"
          />
        </label>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md bg-grape px-4 font-black text-white transition active:scale-95"
        >
          <UserPlus className="size-4" /> Dodaj
        </button>
      </form>
      {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-mint' : 'text-coral'}`}>{msg.text}</p>}
      {results && (
        <ul className="space-y-1.5">
          {results.length === 0 && <li className="text-sm text-ink-soft">Nema igrača s tim imenom.</li>}
          {results.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-md bg-paper p-2">
              <Avatar value={p.avatar} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-black">{p.name}</div>
                <div className="text-xs font-bold text-ink-soft">razina {p.level}</div>
              </div>
              {p.relation ? (
                <span className="text-xs font-extrabold text-ink-soft">{RELATION_LABEL[p.relation]}</span>
              ) : (
                <button
                  onClick={() => addById(p)}
                  className="flex items-center gap-1 rounded-md bg-grape px-3 py-1.5 text-sm font-black text-white transition active:scale-95"
                >
                  <UserPlus className="size-4" /> Dodaj
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Requests() {
  const { incoming, outgoing, respond } = useSocial();
  if (!incoming.length && !outgoing.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Zahtjevi</h2>
      <AnimatePresence initial={false}>
        {incoming.map((p) => (
          <motion.div
            key={p.id}
            layout
            exit={{ opacity: 0, x: 40 }}
            className="flex items-center gap-3 rounded-md bg-surface p-3 shadow-sm"
          >
            <Avatar value={p.avatar} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-black">{p.name}</div>
              <div className="text-xs font-bold text-ink-soft">želi biti prijatelj · razina {p.level}</div>
            </div>
            <button
              onClick={() => respond(p.id, true)}
              aria-label="Prihvati"
              className="grid size-9 place-items-center rounded-md bg-mint text-white transition active:scale-90"
            >
              <Check className="size-4" />
            </button>
            <button
              onClick={() => respond(p.id, false)}
              aria-label="Odbij"
              className="grid size-9 place-items-center rounded-md bg-paper text-ink-soft transition active:scale-90"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
        {outgoing.map((p) => (
          <motion.div key={p.id} layout className="flex items-center gap-3 rounded-md bg-surface/60 p-3">
            <Avatar value={p.avatar} size={40} />
            <div className="min-w-0 flex-1 truncate font-black">{p.name}</div>
            <span className="text-xs font-bold text-ink-soft">čeka odgovor</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  );
}

function FriendList() {
  const { friends, openChat } = useSocial();
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
        Prijatelji {friends.length > 0 && `(${friends.length})`}
      </h2>
      {friends.length === 0 ? (
        <p className="rounded-md bg-surface p-4 text-sm text-ink-soft shadow-sm">
          Još nemaš prijatelja. Podijeli svoj kod ili dodaj nekoga s ljestvice nakon runde.
        </p>
      ) : (
        friends.map((f) => (
          <motion.button
            key={f.id}
            layout
            onClick={() => openChat(f.id)}
            className="flex w-full items-center gap-3 rounded-md bg-surface p-3 text-left shadow-sm transition active:scale-[0.99]"
          >
            <PresenceAvatar value={f.avatar} online={f.online} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-black">{f.name}</span>
                <LevelBadge level={f.level} className="size-5 text-[10px]" />
              </div>
              <div className={`truncate text-sm ${f.unread ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                {f.lastMessage ? f.lastMessage.text : f.online ? 'Online' : 'Offline'}
              </div>
            </div>
            {f.unread > 0 && (
              <span className="grid min-w-6 place-items-center rounded-md bg-coral px-1.5 py-0.5 text-xs font-black text-white">
                {f.unread}
              </span>
            )}
          </motion.button>
        ))
      )}
    </section>
  );
}

export default function FriendsScreen({ nav }) {
  const { openChatId, openChat, friends } = useSocial();
  const chatFriend = friends.find((f) => f.id === openChatId);

  if (chatFriend) return <DirectChat friend={chatFriend} onBack={() => openChat(null)} />;

  return (
    <div className="mx-auto min-h-full max-w-xl pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <ScreenHeader
        title="Prijatelji"
        onBack={() => {
          openChat(null);
          nav.back();
        }}
      />
      <div className="space-y-5 px-4">
        <AddFriend />
        <Requests />
        <FriendList />
      </div>
    </div>
  );
}
