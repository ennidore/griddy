import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

import { config } from './config.js';
import { loadDictionary } from './game/dictionary.js';
import { RoundManager } from './game/RoundManager.js';
import { JsonStore } from './store/JsonStore.js';
import { createRoundSettler } from './services/progression.js';
import { createAuthRouter } from './auth/routes.js';
import { createAuthMiddleware } from './socket/auth.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { securityHeaders, serveClient } from './http/static.js';

const dictionary = await loadDictionary(config.dictionaryPath, {
  minLen: config.game.minWordLength,
  maxLen: config.game.maxWordLength,
});
console.log(`[dict] loaded ${dictionary.size} words from ${config.dictionaryPath}`);

const store = await new JsonStore(config.dataPath).load();
console.log(`[store] ${Object.keys(store.data.players).length} players in ${config.dataPath}`);
console.log(`[auth] ${Object.keys(store.data.accounts).length} accounts`);

const app = express();
app.disable('x-powered-by');
// Which reverse proxies to trust for the client IP (rate limits). See TRUST_PROXY in .env.example.
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders);
app.use(cors({ origin: config.clientOrigins }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', createAuthRouter({ store }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigins },
});

const rounds = new RoundManager({
  io,
  dictionary,
  config,
  onRoundEnd: createRoundSettler({ io, store }),
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    round: rounds.roundId,
    phase: rounds.phase,
    online: io.engine.clientsCount,
    dictionary: dictionary.size,
  });
});

// Uploaded profile pictures (file names are hashes; ?v= in the URL busts caches).
app.use('/api/avatars', express.static(config.avatarDir, { maxAge: '7d', fallthrough: false }));

app.get('/api/leaderboard', async (req, res) => {
  try {
    res.json({ players: await store.topPlayers(20, String(req.query.by || 'score')) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

// The built web client (production). In development Vite serves it instead.
const servingClient = serveClient(app, config.clientDist);
console.log(`[web] ${servingClient ? `serving client from ${config.clientDist}` : 'client not built (dev mode: use Vite)'}`);

io.use(createAuthMiddleware({ store }));
registerSocketHandlers(io, { rounds, config, store });

rounds.start();
server.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
});

const shutdown = async () => {
  rounds.stop();
  await store.flush().catch(() => {});
  io.close();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
