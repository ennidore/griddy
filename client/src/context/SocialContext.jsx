import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useGame } from './GameContext.jsx';

const SocialContext = createContext(null);
const EMPTY = { friends: [], incoming: [], outgoing: [] };

/**
 * Friends, requests and direct messages over the shared socket.
 * The server pushes `friends:changed` whenever the list or presence changes,
 * and `dm:message` for each new direct message.
 */
export function SocialProvider({ children }) {
  const { socket, emit, connected } = useGame();
  const [lists, setLists] = useState(EMPTY);
  const [openChatId, setOpenChatId] = useState(null);
  const openChatRef = useRef(null);
  openChatRef.current = openChatId;
  const listeners = useRef(new Set());

  const refresh = useCallback(async () => {
    const res = await emit('friends:list');
    if (res?.friends) setLists(res);
  }, [emit]);

  useEffect(() => {
    if (!socket) return setLists(EMPTY);
    const onMessage = (msg) => {
      listeners.current.forEach((fn) => fn(msg));
      setLists((l) => ({
        ...l,
        friends: l.friends.map((f) =>
          f.id === msg.from || f.id === msg.to
            ? {
                ...f,
                lastMessage: msg,
                unread: f.id === msg.from && openChatRef.current !== f.id ? f.unread + 1 : f.unread,
              }
            : f,
        ),
      }));
    };
    socket.on('friends:changed', refresh);
    socket.on('dm:message', onMessage);
    return () => {
      socket.off('friends:changed', refresh);
      socket.off('dm:message', onMessage);
    };
  }, [socket, refresh]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  /** Subscribe to incoming DMs (used by the open conversation). */
  const onDirectMessage = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const openChat = useCallback(
    (id) => {
      setOpenChatId(id);
      openChatRef.current = id;
      if (id) {
        setLists((l) => ({ ...l, friends: l.friends.map((f) => (f.id === id ? { ...f, unread: 0 } : f)) }));
        emit('dm:read', { playerId: id });
      }
    },
    [emit],
  );

  // Stable identities so consumers can list these in effect deps safely.
  const sendRequest = useCallback((target) => emit('friends:request', target), [emit]);
  const respond = useCallback((playerId, accept) => emit('friends:respond', { playerId, accept }), [emit]);
  const removeFriend = useCallback((playerId) => emit('friends:remove', { playerId }), [emit]);
  const history = useCallback((playerId) => emit('dm:history', { playerId }), [emit]);
  const sendMessage = useCallback((to, text) => emit('dm:send', { to, text }), [emit]);

  const value = {
    ...lists,
    unreadTotal: lists.friends.reduce((n, f) => n + f.unread, 0),
    badgeCount: lists.friends.reduce((n, f) => n + f.unread, 0) + lists.incoming.length,
    isFriend: (id) => lists.friends.some((f) => f.id === id),
    isPending: (id) => lists.outgoing.some((f) => f.id === id) || lists.incoming.some((f) => f.id === id),
    refresh,
    openChatId,
    openChat,
    onDirectMessage,
    sendRequest,
    respond,
    removeFriend,
    history,
    sendMessage,
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside <SocialProvider>');
  return ctx;
}
