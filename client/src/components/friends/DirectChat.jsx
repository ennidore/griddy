import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, UserMinus } from 'lucide-react';
import { ScreenHeader, IconButton } from '../ui.jsx';
import { PresenceAvatar } from '../Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocial } from '../../context/SocialContext.jsx';

const timeFmt = new Intl.DateTimeFormat('hr', { hour: '2-digit', minute: '2-digit' });

/** One-to-one conversation with a friend: history + live messages. */
export default function DirectChat({ friend, onBack }) {
  const { identity } = useAuth();
  const { history, sendMessage, onDirectMessage, removeFriend, openChat } = useSocial();
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let alive = true;
    history(friend.id).then((res) => alive && setMessages(res.messages || []));
    const off = onDirectMessage((msg) => {
      const inThread = [msg.from, msg.to].includes(friend.id);
      if (!inThread) return;
      setMessages((m) => (m && !m.some((x) => x.id === msg.id) ? [...m, msg] : m));
      if (msg.from === friend.id) openChat(friend.id); // keeps it marked read
    });
    return () => {
      alive = false;
      off();
    };
  }, [friend.id, history, onDirectMessage, openChat]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages?.length]);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    const res = await sendMessage(friend.id, value);
    if (!res.ok) setText(value);
  };

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <ScreenHeader
        title={
          <span className="flex items-center gap-2.5">
            <PresenceAvatar value={friend.avatar} online={friend.online} size={34} />
            <span className="min-w-0">
              <span className="block truncate text-base leading-tight">{friend.name}</span>
              <span className="block text-xs font-bold text-ink-soft">
                {friend.online ? 'online' : 'offline'} · razina {friend.level}
              </span>
            </span>
          </span>
        }
        onBack={onBack}
        right={
          <IconButton
            label={confirmRemove ? 'Potvrdi uklanjanje' : 'Ukloni prijatelja'}
            className={confirmRemove ? 'bg-coral text-white' : ''}
            onClick={async () => {
              if (!confirmRemove) return setConfirmRemove(true);
              await removeFriend(friend.id);
              onBack();
            }}
          >
            <UserMinus className="size-5" />
          </IconButton>
        }
      />

      <ul ref={listRef} className="scroll-soft min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2">
        {messages === null && (
          <li className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-grape" />
          </li>
        )}
        {messages?.length === 0 && (
          <li className="py-10 text-center text-sm text-ink-soft">Pozdravi {friend.name} 👋</li>
        )}
        {messages?.map((m) => {
          const mine = m.from === identity.id;
          return (
            <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-md px-3.5 py-2 ${
                  mine ? 'rounded-br-sm bg-grape text-white' : 'rounded-bl-sm bg-surface shadow-sm'
                }`}
              >
                <div className="break-words">{m.text}</div>
                <div className={`mt-0.5 text-right text-[10px] font-bold ${mine ? 'text-white/70' : 'text-ink-soft'}`}>
                  {timeFmt.format(m.at)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="flex gap-2 px-4 pt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Napiši poruku…"
          className="min-w-0 flex-1 rounded-md bg-surface px-4 py-3 font-semibold shadow-sm outline-none focus:ring-2 focus:ring-grape"
        />
        <button
          type="submit"
          aria-label="Pošalji"
          className="grid size-12 place-items-center rounded-md bg-grape text-white transition active:scale-90"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
