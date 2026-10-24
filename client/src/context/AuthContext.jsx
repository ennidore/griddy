import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { DEFAULT_AVATAR } from '../lib/avatars.js';

const AuthContext = createContext(null);
const GUEST_KEY = 'griddy.guest';
const SESSION_KEY = 'griddy.session';
// Keys used under the app's earlier names; read once so nobody loses their guest/login.
const LEGACY_GUEST_KEYS = ['lettero.guest', 'slovca.guest'];
const LEGACY_SESSION_KEYS = ['lettero.session'];

const API = (import.meta.env.VITE_SERVER_URL || '') + '/api/auth';

function read(key, legacyKeys = []) {
  try {
    for (const k of [key, ...legacyKeys]) {
      const raw = localStorage.getItem(k);
      if (raw != null) return JSON.parse(raw) || null;
    }
  } catch {
    /* storage unavailable or corrupt */
  }
  return null;
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: still works for this tab */
  }
}

const loadGuest = () => read(GUEST_KEY, LEGACY_GUEST_KEYS);

async function post(path, body, token) {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { code: data.error || 'request_failed' });
  return data;
}

/**
 * Two ways in:
 *   account – username + password, handled by the game server; the session
 *             token is kept in localStorage and sent in the socket handshake
 *   guest   – no account; a stable random id, name and avatar in localStorage
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => read(SESSION_KEY, LEGACY_SESSION_KEYS)); // { token, id, username, avatar }
  const [guest, setGuest] = useState(loadGuest);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const saveSession = useCallback((next) => {
    write(SESSION_KEY, next);
    setSession(next);
  }, []);

  // ---- accounts
  const startSession = ({ token, user }) => saveSession({ token, id: user.id, username: user.username, avatar: null });

  const signIn = async (username, password) => startSession(await post('login', { username, password }));

  const signUp = async (username, password) => startSession(await post('register', { username, password }));

  /** Keep the cached name/avatar in sync with the server (called by GameContext). */
  const syncAccount = useCallback(
    ({ name, avatar }) => {
      const s = sessionRef.current;
      if (s && (s.username !== name || s.avatar !== avatar)) saveSession({ ...s, username: name, avatar });
    },
    [saveSession],
  );

  /** The server no longer accepts the token (expired or logged out elsewhere). */
  const dropSession = useCallback(() => saveSession(null), [saveSession]);

  // ---- guests
  const playAsGuest = (name, avatar = DEFAULT_AVATAR) => {
    const next = { id: guest?.id || crypto.randomUUID(), name, avatar, active: true };
    write(GUEST_KEY, next);
    setGuest(next);
  };

  const updateGuest = (patch) => {
    const next = { ...guest, ...patch };
    write(GUEST_KEY, next);
    setGuest(next);
  };

  const signOut = async () => {
    const s = sessionRef.current;
    if (s) {
      post('logout', {}, s.token).catch(() => {});
      saveSession(null);
    }
    if (guest?.active) updateGuest({ active: false });
  };

  // ---- unified identity
  const identity = useMemo(() => {
    if (session) {
      return {
        kind: 'user',
        key: `user:${session.id}`,
        id: session.id,
        name: session.username,
        avatar: session.avatar || DEFAULT_AVATAR,
      };
    }
    if (guest?.active) {
      return {
        kind: 'guest',
        // Name/avatar are part of the key so a change reconnects with fresh data.
        key: `guest:${guest.id}:${guest.name}:${guest.avatar}`,
        id: `guest:${guest.id}`,
        name: guest.name,
        avatar: guest.avatar,
      };
    }
    return null;
  }, [session, guest]);

  const getSocketAuth = useCallback(() => {
    const s = sessionRef.current;
    if (s) return { sessionToken: s.token };
    const g = loadGuest();
    return { guestId: g?.id, guestName: g?.name, avatar: g?.avatar };
  }, []);

  const value = {
    loading: false,
    identity,
    signIn,
    signUp,
    signOut,
    playAsGuest,
    updateGuest,
    syncAccount,
    dropSession,
    getSocketAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
