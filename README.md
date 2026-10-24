# Griddy: a real-time Croatian word grid

Everyone online plays the same 4×4 board at the same time. A round loops forever:
**Igra** (1:30) → **Rješenja** (10 s, every valid word revealed) → **Rezultati + razgovor** (15 s) → new board.

Around the game: a main menu, levels and coins, a tile shop, light/dark themes with two
backgrounds each, friends with real-time direct messages, and join-now-or-wait when a round is
already running.

## Project structure

```
griddy/
├── package.json                 npm workspaces: dev · build · start · test
├── Dockerfile · docker-compose.yml   production image (see "Deploying")
├── server/                      Node.js · Express · Socket.io
│   ├── .env.example
│   ├── data/words-hr.txt        final 39,298-word dictionary (see "Dictionary")
│   ├── scripts/build-wordlist.mjs   regenerates it from frequency list + hunspell
│   ├── data/db.json             game data (created at runtime, gitignored)
│   ├── data/avatars/            uploaded profile pictures (gitignored)
│   ├── src/
│   │   ├── index.js             bootstrap: dictionary, store, HTTP + Socket.io, round loop
│   │   ├── config.js            env → config (phase lengths, grid size, CORS, paths)
│   │   ├── game/
│   │   │   ├── alphabet.js      Croatian letters, frequencies, normalisation (ǉ → lj)
│   │   │   ├── board.js         weighted board generation, adjacency
│   │   │   ├── dictionary.js    word-list loader + trie
│   │   │   ├── solver.js        trie-pruned DFS → every word on the board
│   │   │   ├── scoring.js       2^(len−2) exponential scoring
│   │   │   ├── validate.js      server-side path validation
│   │   │   └── RoundManager.js  global state machine, join/wait, rewards on round end
│   │   ├── progression/levels.js   XP curve + coin rewards (pure, unit-tested)
│   │   ├── shop/catalog.js         tile skins: price, level gate
│   │   ├── store/JsonStore.js      accounts, sessions, players, inventory, friends, DMs (file-backed)
│   │   ├── http/static.js       production: serves client/dist, security + cache headers
│   │   ├── auth/
│   │   │   ├── passwords.js     scrypt hashing, session tokens, username/password rules
│   │   │   └── routes.js        POST /api/auth/register · login · logout
│   │   ├── socket/
│   │   │   ├── auth.js          handshake → account (session token) or guest
│   │   │   ├── handlers.js      connection, game join/leave, words, round chat
│   │   │   ├── social.js        friends (by code or username search) + direct messages
│   │   │   ├── shop.js          buy / equip
│   │   │   └── profile.js       name/picture changes, picture uploads, all-time leaderboard
│   │   └── services/
│   │       └── progression.js   applies round rewards, pushes account updates
│   └── test/                    node:test: game logic, progression, store, accounts
└── client/                      React (Vite) · Tailwind v4 · Framer Motion · Lucide
    ├── vite.config.js           dev proxy for /socket.io + /api to :3001, app version
    ├── public/                  manifest, service worker (sw.js), app icons
    └── src/
        ├── main.jsx · App.jsx (screen navigation) · index.css (theme tokens per background)
        ├── lib/                 socket, avatars, image (crop/resize uploads), cosmetics, game helpers
        ├── context/
        │   ├── ThemeContext.jsx   light/dark/system + chosen background per mode
        │   ├── AuthContext.jsx    username/password login, signup, guest identity
        │   ├── GameContext.jsx    the app-wide socket: round state, account, join/leave, shop
        │   └── SocialContext.jsx  friends, requests, DMs, unread counts
        ├── screens/
        │   ├── MenuScreen.jsx       profile (tap picture), level/XP, coins, Igraj, 3 icon shortcuts
        │   ├── GameScreen.jsx       top panel + board, join prompt, waiting state, phases
        │   ├── CustomizeScreen.jsx  theme, backgrounds, tile shop
        │   ├── FriendsScreen.jsx    add by code or username, requests, friend list
        │   └── LeaderboardScreen.jsx  all-time rankings: best round, wins, level, words
        └── components/
            ├── board/Board.jsx · Tile.jsx (skinnable via CSS variables) · WordPreview.jsx
            ├── phases/JoinPrompt · RevealModal · LeaderboardChat (rewards, add friend) · Chat
            ├── friends/DirectChat.jsx   1:1 conversation
            ├── RewardToast.jsx · ui.jsx (CoinPill, LevelBar, ScreenHeader, ThemeToggle)
            ├── auth/AuthScreen.jsx · profile/ProfileSheet.jsx
            └── GamePanel.jsx        above the board: played words, words per length, back, progress, score, timer
```

## How it works

**One authoritative round.** `RoundManager` holds a single global round. Each phase has an
absolute deadline (`phaseEndsAt`, server epoch ms). Every phase change is broadcast with
`round:state`, and late joiners get the same state in `sync`. The next deadline chains off the
previous one, so the loop doesn't drift.

**Synchronised timers.** On connect, the client pings `time:ping` five times and keeps the
lowest-RTT sample to estimate `serverTime − clientTime`. Timers render `phaseEndsAt − (now + offset)`,
so all screens agree to within a few ms, whatever the device clock says.

**Server-validated words.** The client sends only the **tile path**, never a word string. The
server checks bounds, adjacency, and that no tile is reused, then rebuilds the word from its own
board and looks it up in that board's precomputed solution set. Duplicates and late submissions
are rejected.

**Croatian letters.** Each tile is one character from the 27-letter set
(a b c č ć d dž→d+ž đ e f g h i j k l lj→l+j m n nj→n+j o p r s š t u v z ž). Following the
spec, *lj*, *nj* and *dž* are spelled across two tiles, so `ljubav` is L-J-U-B-A-V. Word lists that
use the single-codepoint ligatures (ǉ ǌ ǆ) are normalised on load.

**Scoring.** `points = 2^(letters − 2)`: 3 → 2, 4 → 4, 5 → 8, 6 → 16, 7 → 32 …

**Board quality.** The generator draws letters weighted by Croatian frequency (5–8 vowels,
capped repeats), builds 40 candidates and keeps the one with the most solutions.

**Joining mid-round.** Opening the game while a round is running asks **Uđi odmah** (join with
the time left) or **Čekaj novu** (watch a blurred board until the next round). Sockets on the
game screen sit in a `game` room. Every new round automatically enters everyone in that room,
and only entered players can submit words. The back button leaves the room; your score in the
current round is kept.

**Levels and coins.** These are computed on the server when a round ends
(`progression/levels.js`). Only players who found at least one word earn anything:

| | Coins | |
|---|---|---|
| Win (rank 1, ties all win) | 15 | replaces the top-10 reward |
| Top 10 (rank 2–10) | 10 | |
| Found the round's longest word | +5 | stacks with the above |
| Each level gained | +25 | |

XP = round score + 10. Level L needs `50·L·(L−1)` total XP (L2 = 100, L3 = 300, L5 = 1000, L8 = 2800).
New players start with 100 coins. Players see these rules only by
tapping their coin balance on the home page; the values are sent from the server (`COIN_RULES`).

**Tile shop.** There are 20 skins. Klasik and Tinta are free; the rest are bought with coins
and unlock by level:

| Kind | Skins (price · level) |
|---|---|
| Colourways | More, Šuma (200 · L1), Lavanda (250 · L2), Tinta (free) |
| Gradients | Bombon (300 · L2), Breskva (350 · L2), Zalazak (450 · L3), Aurora (600 · L4), Drvo (750 · L5), Zlato (1500 · L8) |
| Patterns | Pruge stripes, Točkice dots (400 · L3), Mreža graph paper (450 · L3), Karo checks (500 · L4), Lubenica (650 · L5), Retro bands (700 · L5), Mramor marble (800 · L6), Galaksija stars (1200 · L7) |
| Special | Neon glow (500 · L3) |

The server checks level, balance and ownership, so a modified client can't cheat. Skins are CSS
variables on the board, and patterns are pure CSS gradients. Adding one means a catalog entry in
`server/src/shop/catalog.js` plus a style entry in `client/src/lib/cosmetics.js`.

**Themes.** Light / dark / system mode, with three backgrounds each: Borovnica (blue-violet),
Jabuka (green) and Jagoda (red) for light; Noć (violet), Ponoć (navy + green) and Žar (red) for
dark. Customize shows only the
backgrounds for the chosen mode, or both sets when following the system. Every colour in the UI,
including the accent, is a theme token, so a background restyles the whole app. This preference
is stored per device.

**During a round** one panel above the board holds everything, and it fits on a phone screen
without scrolling:
- your played words (numbered, newest first)
- found / total words for each length from 3 to 8+ (greyed out where the board has none)
- the back button
- a progress bar (share of the board's points you've scored)
- your score next to the board's maximum
- the timer

There's no live scoreboard, so the race stays about the board.

**Profile pictures.** Pick a preset or upload your own image. The browser crops it to a square
and shrinks it to 256 px. The game server stores it in `server/data/avatars/` and serves it at
`/api/avatars/…`. This works for guests and registered players alike.

**Friends and messages.** Every player gets a 6-character friend code. You can add friends by
code, by searching their username, or straight from the round leaderboard. Requests can be accepted or declined, and if both
players request each other the friendship is accepted automatically. The friends list shows
who's online and unread counts. Direct messages are delivered live to all of the recipient's
open tabs and stored server-side (the last 200 per conversation).

**Game data store.** Progression, inventory, stats, friends and messages live in
`server/data/db.json` via `JsonStore`, with debounced atomic writes. Every store method is async,
so a Postgres-backed store can replace it without touching callers. The same file also holds
accounts (hashed passwords) and login sessions. Delete `db.json` to reset all accounts and
progression.

### Socket events

| Direction | Event | Payload |
|---|---|---|
| S→C | `sync` | `{ state, you, chat, online, player, catalog }` on connect |
| S→C | `round:state` | `{ roundId, phase, board, phaseEndsAt, durations, totalWords, maxScore, players, solutions?, rankings? }` |
| S→C | `round:scores` | `{ roundId, top[] }`, throttled to 1/s |
| S→C | `player:update` | `{ player, rewards? }` (level, coins, owned, equipped, stats) |
| S→C | `chat:message` / `presence` | round chat line / `{ online, playing }` |
| S→C | `friends:changed` / `dm:message` | refetch the friends list / `{ id, from, to, text, at }` |
| C→S | `game:join` (ack) / `game:leave` | `{ now }` → progress |
| C→S | `word:submit` (ack) | `{ roundId, path: number[] }` → `{ ok, word, points, score }` or `{ ok:false, reason }` |
| C→S | `shop:buy` / `shop:equip` (ack) | `{ itemId }` |
| C→S | `friends:list` · `friends:search` · `friends:request` · `friends:respond` · `friends:remove` (ack) | – · `{ query }` · `{ code }` or `{ playerId }` · `{ playerId, accept }` · `{ playerId }` |
| C→S | `profile:avatar` · `leaderboard:top` (ack) | `{ data: dataUrl }` → `{ url }` · `{ by }` (score, wins, level, words) |
| C→S | `dm:history` · `dm:send` (ack) · `dm:read` | `{ playerId }` · `{ to, text }` · `{ playerId }` |
| C→S | `time:ping` (ack) · `chat:send` · `profile:refresh` | → `serverNow` · `{ text }` · – |

## Run it locally

Prerequisite: **Node.js 20.6+** (22 LTS recommended). On Windows:

```bash
winget install OpenJS.NodeJS.LTS
```

Open a new terminal after installing, then from the project root:

```bash
npm install
```

```bash
cp server/.env.example server/.env
```

```bash
cp client/.env.example client/.env
```

(PowerShell: use `Copy-Item` in place of `cp`.)

```bash
npm run dev
```

- Client: http://localhost:5173
- Server health: http://localhost:3001/api/health

No external services are needed: accounts, progression and friends all live on the game server.
To test friends on one machine, open a second player at `http://friend.localhost:5173`,
which has its own browser storage. To try it on your phone, run `npm run dev -w client -- --host` and
open the LAN URL. Vite proxies the socket, so no other config is needed.

For quicker testing, shorten the rounds in `server/.env`, e.g. `ACTIVE_SECONDS=30`.

Run the core-logic unit tests:

```bash
npm test -w server
```

### Accounts and guests

There are two ways in, both on the login screen:

- **Account (Prijava / Registracija):** a username (3–20 characters: letters, including
  Croatian ones, digits, `_ . -`) and a password (at least 6 characters). There's no email.
  Usernames are unique regardless of case. Progress is tied to the account, so it follows you to
  any device.
- **Gost (guest):** a nickname and an avatar, no password. Progress is tied to a random id saved
  in that browser.

How it works (`server/src/auth/`):

- Passwords are hashed with scrypt and a random salt and never stored in plain text.
- Login returns a random session token. Only its SHA-256 hash is stored, and it expires after
  90 days without use.
- The client keeps the token in localStorage and sends it in the Socket.io handshake.
- Logging out deletes the session.
- Register and login are rate-limited to 10 attempts per minute per IP.
- Logged-in players change their username (it must stay unique) and picture through the server
  (`profile:update`).

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/auth/register` | `{ username, password }` | `201 { token, user }` · `409 username_taken` · `400 bad_username / bad_password` |
| `POST /api/auth/login` | `{ username, password }` | `{ token, user }` · `401 wrong_credentials` |
| `POST /api/auth/logout` | `Authorization: Bearer <token>` | `{ ok }` |

There's no password reset, because there's no email. A forgotten password means a new account.
For production, serve the game over HTTPS so passwords and tokens aren't sent in the clear.

## Dictionary

`server/data/words-hr.txt` is the final dictionary: **39,298 words**. It's every word in the
50k Croatian frequency list that the spell-checker accepts, plus the original hand-written
starter list. It includes everyday inflected forms (kuća, kuće, kući, gledali, ljubavi …).

| Measure | Value |
|---|---|
| Findable words per board | about 95–135 (median ~117) |
| Longest word on a board | 7–8 letters |
| Extra server memory | ~18 MB |
| Load time at startup | ~0.1 s |

Rejected alternative: the spell-checker's full set of about 950,000 forms. It gives ~300 words
per board, but uses ~350 MB, takes 2.6 s to load, and is full of rare and archaic forms.

It was generated by `server/scripts/build-wordlist.mjs` from two sources:

- [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/hr/hr_50k.txt`,
  word frequencies from OpenSubtitles (data CC BY-SA 4.0)
- the LibreOffice hunspell dictionary `hr_HR/hr_HR.dic` + `.aff`
  ([LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries)). The script expands
  its suffix rules (about 1M valid forms) and keeps only frequent words found there. That drops
  names, English and typos. A blocklist removes vulgar words and slurs (edit `BLOCK` in the
  script).

To regenerate it, download those three files and run the script with a very large target, which
keeps every qualifying word:

```bash
node server/scripts/build-wordlist.mjs hr_HR.aff hr_HR.dic hr_50k.txt server/data/words-hr.txt 1000000000 server/data/words-hr.txt
```

The loader also accepts hunspell `.dic` lines (`word/FLAGS`) and `word<TAB>freq` lists directly.
Set `DICTIONARY_PATH` in `server/.env` to point at a different file. Restart the server after
changing the list, since it's loaded once at startup. A full inflected lexicon
(1M+ forms) builds a large in-memory trie. If memory gets tight, filter by frequency or switch
to a DAWG.

## Deploying (production)

In production one Node process serves everything on one port: the built web app, the API
(`/api`) and the live socket (`/socket.io`). The app is installable on phones and desktops
("Add to Home Screen" / "Install app"): it has a manifest, icons and a service worker.

### Option A: Docker (recommended)

```bash
docker compose up -d --build
```

Griddy then runs on port 3001. Accounts, progression and uploaded pictures are stored in the
`griddy-data` volume (`/data` in the container), so they survive restarts and updates. The image
runs as a non-root user and has a health check on `/api/health`.

### Option B: plain Node (any VPS)

```bash
npm ci
```

```bash
npm run build
```

```bash
npm start
```

Set `NODE_ENV=production` in `server/.env`, and point `DATA_PATH` / `AVATAR_DIR` at a folder that
is backed up. To keep it running, use a process manager (systemd, pm2) or a service like Render,
Railway or Fly.io (build command `npm ci && npm run build`, start command `npm start`).

### Checklist

- **HTTPS is required.** Logins send passwords, and browsers only install apps (and run service
  workers) on HTTPS. Put Griddy behind a reverse proxy that handles TLS (Caddy, nginx, or your
  host's built-in HTTPS), and make sure it forwards WebSocket upgrades for `/socket.io`.
- **`TRUST_PROXY=1`** (or the number of proxy hops) behind a proxy, so login rate limits see real
  client IPs.
- **One instance only.** The round loop and the JSON store live in a single process, so don't
  scale horizontally yet (see Next steps).
- **Back up `/data`** (or `DATA_PATH` + `AVATAR_DIR`). It holds every account, hashed password,
  coin balance and friendship.
- **Credits:** the word list is derived from FrequencyWords (CC BY-SA 4.0) and hunspell-hr. The
  login screen credits both, so keep that line if you change the UI.
- **Pick a license** for your own code before publishing the source.

What the server adds in production: security headers (CSP, `X-Frame-Options`, `nosniff`,
referrer and permissions policies), long-term caching for fingerprinted assets and `no-cache` for
`index.html`/`sw.js` so updates roll out, a 20 kB JSON body limit, and a flush of game data on
shutdown.

## Next steps beyond the MVP

- Redis adapter for Socket.io plus a single "round leader" to scale past one server process
- Pre-generate the next board during the reveal phase
- Profanity filter for chat and usernames; per-IP rate limits
- Signed guest tokens (guest ids are currently client-chosen, so a copied id could take over a guest's coins and friends)
- Move `JsonStore` to Postgres once you run more than one server process
- Weekly/daily leaderboards (the all-time one is live)
