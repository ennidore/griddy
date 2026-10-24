import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || undefined; // undefined → same origin (Vite proxy)

/**
 * `getAuth` is called on every (re)connect, so the current session token or
 * guest identity is sent, not the one from the first connection.
 */
export function createSocket(getAuth) {
  return io(SERVER_URL, {
    auth: (cb) => cb(getAuth()),
    transports: ['websocket', 'polling'],
  });
}

/**
 * Estimates serverTime - clientTime with a few pings, keeping the sample with
 * the lowest round-trip (least network noise).
 */
export async function measureClockOffset(socket, samples = 5) {
  let best = { rtt: Infinity, offset: 0 };
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    const serverNow = await new Promise((resolve) => {
      socket.timeout(3000).emit('time:ping', (err, now) => resolve(err ? null : now));
    });
    const t1 = Date.now();
    if (serverNow == null) continue;
    const rtt = t1 - t0;
    if (rtt < best.rtt) best = { rtt, offset: serverNow + rtt / 2 - t1 };
  }
  return best.offset;
}
