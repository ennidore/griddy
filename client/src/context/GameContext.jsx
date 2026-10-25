import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { createSocket, measureClockOffset } from '../lib/socket.js';

const GameContext = createContext(null);

const emptyProgress = (roundId = null, joined = false) => ({ roundId, joined, score: 0, words: [] });

/** Promise wrapper for an acknowledged emit. */
const request = (socket, event, payload) =>
  new Promise((resolve) => {
    if (!socket?.connected) return resolve({ ok: false, reason: 'offline' });
    const done = (err, res) => resolve(err ? { ok: false, reason: 'timeout' } : res);
    // Omit the payload entirely when absent so handlers receive the ack first.
    if (payload === undefined) socket.timeout(5000).emit(event, done);
    else socket.timeout(5000).emit(event, payload, done);
  });

/**
 * Owns the single app-wide socket: round state, the player's account
 * (level, coins, inventory) and game/shop actions. Social features subscribe
 * to the same socket through `socket` (see SocialContext).
 */
export function GameProvider({ children }) {
  const { identity, getSocketAuth, syncAccount, dropSession, syncGuestName, resetGuestIdentity } = useAuth();

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [state, setState] = useState(null); // server publicState
  const [me, setMe] = useState(emptyProgress());
  const [liveScores, setLiveScores] = useState({ roundId: null, top: [] });
  const [chat, setChat] = useState([]);
  const [presence, setPresence] = useState({ online: 0, playing: 0 });
  const [clockOffset, setClockOffset] = useState(0);
  const [player, setPlayer] = useState(null); // account: level, coins, owned, equipped, stats
  const [catalog, setCatalog] = useState({ tiles: [], coinRules: null });
  const [rewards, setRewards] = useState(null); // last round's reward summary

  const socketRef = useRef(null);
  const roundIdRef = useRef(null);
  const inGameRef = useRef(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!identity) return;
    const s = createSocket(getSocketAuth);
    socketRef.current = s;
    setSocket(s);

    s.on('connect', async () => {
      setConnected(true);
      setError(null);
      // Re-enter the game room after a reconnect.
      if (inGameRef.current) {
        s.emit('game:join', { now: joinedRef.current }, (progress) => progress && setMe(progress));
      }
      setClockOffset(await measureClockOffset(s));
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => {
      setError(err.message);
      // Expired or revoked login: back to the sign-in screen.
      if (err.message === 'invalid_session') dropSession();
      // Someone else already proved ownership of this guest id: continue as a new guest.
      if (err.message === 'guest_taken') resetGuestIdentity();
    });

    s.on('sync', ({ state: st, you, chat: history, online, player: account, catalog: cat }) => {
      roundIdRef.current = st.roundId;
      setState(st);
      if (!inGameRef.current) setMe({ roundId: you.roundId, joined: you.joined, score: you.score, words: you.words });
      setChat(history);
      setPresence((p) => ({ ...p, online }));
      setPlayer(account);
      setCatalog(cat);
      if (account && !account.isGuest) syncAccount(account);
      if (account?.isGuest) syncGuestName(account.name);
    });

    s.on('round:state', (st) => {
      if (st.roundId !== roundIdRef.current) {
        roundIdRef.current = st.roundId;
        // The server auto-enters everyone on the game screen into a new round.
        joinedRef.current = inGameRef.current;
        setMe(emptyProgress(st.roundId, inGameRef.current));
      }
      setState(st);
    });

    s.on('round:scores', setLiveScores);
    s.on('chat:message', (msg) => setChat((c) => [...c.slice(-49), msg]));
    s.on('presence', setPresence);
    s.on('player:update', ({ player: account, rewards: r }) => {
      if (account && !account.isGuest) syncAccount(account);
      setPlayer(account);
      if (r) setRewards({ ...r, id: Date.now() });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setPlayer(null);
    };
    // Reconnect only when the identity itself changes, not on every profile render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.key]);

  /** Enter the game screen. `now` joins the running round; otherwise wait for the next. */
  const joinGame = useCallback(async (now) => {
    inGameRef.current = true;
    const progress = await request(socketRef.current, 'game:join', { now });
    if (progress?.roundId != null) {
      joinedRef.current = progress.joined;
      setMe(progress);
    }
  }, []);

  const leaveGame = useCallback(() => {
    inGameRef.current = false;
    socketRef.current?.emit('game:leave');
  }, []);

  /** Sends a tile path; resolves with the server's verdict. */
  const submitPath = useCallback(async (path) => {
    const roundId = roundIdRef.current;
    const res = await request(socketRef.current, 'word:submit', { roundId, path });
    // The round changed while we waited: the verdict belongs to a finished round.
    // Drop it so it can't show up (or overwrite progress) in the new one.
    if (roundIdRef.current !== roundId) return { ok: false, reason: 'stale', roundId };
    if (res.ok) {
      setMe((m) => ({
        ...m,
        roundId,
        score: res.score,
        words: [{ word: res.word, points: res.points }, ...(m.roundId === roundId ? m.words : [])],
      }));
    }
    return { ...res, roundId };
  }, []);

  const sendChat = useCallback((text) => socketRef.current?.emit('chat:send', { text }), []);
  /** Accounts only: change name and/or avatar on the server. */
  const updateProfile = useCallback((patch) => request(socketRef.current, 'profile:update', patch), []);
  const buyItem = useCallback((itemId) => request(socketRef.current, 'shop:buy', { itemId }), []);
  const equipItem = useCallback((itemId) => request(socketRef.current, 'shop:equip', { itemId }), []);
  const emit = useCallback((event, payload) => request(socketRef.current, event, payload), []);

  const value = {
    socket,
    emit,
    connected,
    error,
    state,
    me,
    liveScores: liveScores.roundId === state?.roundId ? liveScores.top : [],
    chat,
    online: presence.online,
    playing: presence.playing,
    clockOffset,
    player,
    catalog,
    rewards,
    clearRewards: () => setRewards(null),
    joinGame,
    leaveGame,
    submitPath,
    sendChat,
    updateProfile,
    buyItem,
    equipItem,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
