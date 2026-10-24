import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : fallback);

const production = process.env.NODE_ENV === 'production';

/** Parses TRUST_PROXY: "true"/"false", a hop count ("1"), or Express keywords ("loopback"). */
function trustProxy(v) {
  if (v === undefined || v === '') return 'loopback';
  if (v === 'true' || v === 'false') return v === 'true';
  return Number.isFinite(Number(v)) ? Number(v) : v;
}

export const config = {
  production,
  port: num(process.env.PORT, 3001),
  // Extra browser origins allowed to call the API/socket (only needed when the client is hosted
  // on a different domain). In production the server hosts the client itself, so none by default.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? (production ? '' : 'http://localhost:5173'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Built web client served by this server (npm run build). Ignored if the folder doesn't exist.
  clientDist: path.resolve(root, process.env.CLIENT_DIST || '../client/dist'),
  trustProxy: trustProxy(process.env.TRUST_PROXY),

  phases: {
    activeMs: num(process.env.ACTIVE_SECONDS, 90) * 1000,
    revealMs: num(process.env.REVEAL_SECONDS, 10) * 1000,
    leaderboardMs: num(process.env.LEADERBOARD_SECONDS, 15) * 1000,
  },

  game: {
    gridSize: 4,
    minWordLength: 3,
    maxWordLength: 16,
    // Generate this many candidate boards and keep the richest one.
    boardCandidates: 40,
  },

  dictionaryPath: path.resolve(root, process.env.DICTIONARY_PATH || './data/words-hr.txt'),
  dataPath: path.resolve(root, process.env.DATA_PATH || './data/db.json'),
  avatarDir: path.resolve(root, process.env.AVATAR_DIR || './data/avatars'),

  chat: {
    maxLength: 200,
    history: 50,
    minIntervalMs: 700,
  },
};
