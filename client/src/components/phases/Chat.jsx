import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import Avatar from '../Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGame } from '../../context/GameContext.jsx';

export default function Chat({ className = '' }) {
  const { chat, sendChat } = useGame();
  const { identity } = useAuth();
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    setText('');
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <ul ref={listRef} className="scroll-soft min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {chat.length === 0 && <li className="text-sm text-ink-soft">Budi prvi koji će nešto reći 👋</li>}
        {chat.map((m) => {
          const mine = m.playerId === identity.id;
          return (
            <li key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <Avatar value={m.avatar} size={24} />
              <div
                className={`max-w-[75%] rounded-md px-3 py-1.5 text-sm ${
                  mine ? 'rounded-br-sm bg-grape text-white' : 'rounded-bl-sm bg-paper'
                }`}
              >
                {!mine && <div className="text-[11px] font-extrabold opacity-60">{m.name}</div>}
                <div className="break-words">{m.text}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Napiši poruku…"
          className="min-w-0 flex-1 rounded-md bg-paper px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-grape"
        />
        <button
          type="submit"
          aria-label="Pošalji"
          className="grid size-10 place-items-center rounded-md bg-grape text-white transition active:scale-90"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
