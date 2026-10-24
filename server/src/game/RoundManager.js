import { buildNeighbors, generateBoard } from './board.js';
import { solveBoard } from './solver.js';
import { validatePath } from './validate.js';
import { computeRoundRewards } from '../progression/levels.js';

export const PHASE = Object.freeze({
  ACTIVE: 'active',
  REVEAL: 'reveal',
  LEADERBOARD: 'leaderboard',
});

/** Socket.io room holding every socket currently on the game screen. */
export const GAME_ROOM = 'game';

const LIVE_SCORE_THROTTLE_MS = 1000;

/**
 * Owns the single global round and drives the loop:
 *   ACTIVE (2 min) → REVEAL (10 s) → LEADERBOARD (10 s) → next ACTIVE ...
 *
 * Phase deadlines are absolute server timestamps (`phaseEndsAt`). Clients
 * render timers from that deadline plus their measured clock offset, so every
 * player sees the same countdown regardless of when they joined.
 */
export class RoundManager {
  constructor({ io, dictionary, config, onRoundEnd }) {
    this.io = io;
    this.dictionary = dictionary;
    this.config = config;
    this.onRoundEnd = onRoundEnd;
    this.size = config.game.gridSize;
    this.neighbors = buildNeighbors(this.size);

    this.roundId = 0;
    this.round = null;
    this.phase = null;
    this.phaseEndsAt = 0;
    this.timer = null;
    this.liveScoreTimer = null;
  }

  start() {
    this.#startRound(Date.now());
  }

  stop() {
    clearTimeout(this.timer);
    clearTimeout(this.liveScoreTimer);
  }

  // ---------------------------------------------------------------- loop

  #startRound(startAt) {
    const { board, solutions } = this.#pickBoard();
    this.roundId += 1;
    this.round = {
      id: this.roundId,
      board,
      solutions,
      solutionWords: new Set(solutions.map((s) => s.word)),
      maxScore: solutions.reduce((sum, s) => sum + s.points, 0),
      // How many words of each length exist; shown during play without revealing words.
      lengthCounts: solutions.reduce((acc, s) => {
        const len = [...s.word].length;
        acc[len] = (acc[len] || 0) + 1;
        return acc;
      }, {}),
      startedAt: startAt,
      players: new Map(), // playerId -> { id, name, avatar, isGuest, score, words: Map<word, points> }
      rankings: null,
    };
    // Everyone already on the game screen (including those who chose to wait
    // for this round) is entered automatically.
    for (const sid of this.io.sockets.adapter.rooms.get(GAME_ROOM) || []) {
      const player = this.io.sockets.sockets.get(sid)?.data.player;
      if (player) this.#playerEntry(player);
    }
    console.log(`[round ${this.roundId}] ${board.join('').toUpperCase()} — ${solutions.length} words`);
    this.#enterPhase(PHASE.ACTIVE, startAt, this.config.phases.activeMs);
  }

  #enterPhase(phase, startAt, durationMs) {
    this.phase = phase;
    // Chain deadlines off the previous deadline (not Date.now()) to avoid drift.
    this.phaseEndsAt = startAt + durationMs;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.#advance(), Math.max(0, this.phaseEndsAt - Date.now()));
    this.io.emit('round:state', this.publicState());
  }

  #advance() {
    const prevEnd = this.phaseEndsAt;
    const { revealMs, leaderboardMs } = this.config.phases;
    switch (this.phase) {
      case PHASE.ACTIVE:
        this.#finalizeRound();
        this.#enterPhase(PHASE.REVEAL, prevEnd, revealMs);
        break;
      case PHASE.REVEAL:
        this.#enterPhase(PHASE.LEADERBOARD, prevEnd, leaderboardMs);
        break;
      case PHASE.LEADERBOARD:
      default:
        this.#startRound(prevEnd);
    }
  }

  #pickBoard() {
    const { boardCandidates, minWordLength } = this.config.game;
    let best = null;
    for (let k = 0; k < boardCandidates; k++) {
      const board = generateBoard(this.size);
      const solutions = solveBoard(board, this.neighbors, this.dictionary.trie, minWordLength);
      if (!best || solutions.length > best.solutions.length) best = { board, solutions };
    }
    return best;
  }

  #finalizeRound() {
    clearTimeout(this.liveScoreTimer);
    this.liveScoreTimer = null;
    const rankings = computeRoundRewards(this.#rankPlayers());
    this.round.rankings = rankings;

    // Persist asynchronously; never block or crash the loop on store errors.
    Promise.resolve(this.onRoundEnd?.(rankings)).catch((err) =>
      console.error('[round] failed to settle rewards:', err),
    );
  }

  #rankPlayers() {
    const list = [...this.round.players.values()]
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isGuest: p.isGuest,
        score: p.score,
        wordCount: p.words.size,
        bestWord: [...p.words.keys()].sort((a, b) => b.length - a.length)[0] || null,
      }))
      .sort((a, b) => b.score - a.score || b.wordCount - a.wordCount);

    // Standard competition ranking (1, 2, 2, 4); ties at the top all win.
    let rank = 0;
    list.forEach((p, idx) => {
      if (idx === 0 || p.score !== list[idx - 1].score) rank = idx + 1;
      p.rank = rank;
      p.won = rank === 1 && p.score > 0;
    });
    return list;
  }

  // ------------------------------------------------------------ gameplay

  /** Ensures the player has an entry in the current round. */
  #playerEntry(player) {
    let entry = this.round.players.get(player.id);
    if (!entry) {
      entry = { ...player, score: 0, words: new Map() };
      this.round.players.set(player.id, entry);
    } else {
      // Keep display info fresh if the profile changed mid-round.
      entry.name = player.name;
      entry.avatar = player.avatar;
    }
    return entry;
  }

  /**
   * Player opened the game screen. `now: true` enters the running round
   * immediately; otherwise they are entered automatically at the next round.
   */
  join(player, { now }) {
    if (now && this.phase === PHASE.ACTIVE) this.#playerEntry(player);
    return this.playerProgress(player.id);
  }

  submitWord(player, path) {
    if (this.phase !== PHASE.ACTIVE) return { ok: false, reason: 'round_over' };
    if (Date.now() > this.phaseEndsAt) return { ok: false, reason: 'round_over' };

    const entry = this.round.players.get(player.id);
    if (!entry) return { ok: false, reason: 'not_joined' };

    const { minWordLength } = this.config.game;
    const check = validatePath(this.round.board, this.size, path, minWordLength);
    if (!check.ok) return check;

    const { word } = check;
    if (entry.words.has(word)) return { ok: false, reason: 'already_found', word };
    if (!this.round.solutionWords.has(word)) return { ok: false, reason: 'not_a_word', word };

    const points = this.round.solutions.find((s) => s.word === word).points;
    entry.words.set(word, points);
    entry.score += points;
    this.#scheduleLiveScores();
    return { ok: true, word, points, score: entry.score, wordCount: entry.words.size };
  }

  #scheduleLiveScores() {
    if (this.liveScoreTimer) return;
    this.liveScoreTimer = setTimeout(() => {
      this.liveScoreTimer = null;
      if (this.phase === PHASE.ACTIVE) this.io.emit('round:scores', this.liveScores());
    }, LIVE_SCORE_THROTTLE_MS);
  }

  liveScores() {
    return {
      roundId: this.roundId,
      top: [...this.round.players.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, wordCount: p.words.size })),
    };
  }

  // -------------------------------------------------------------- views

  /** State broadcast to everyone. Solutions are only revealed after ACTIVE. */
  publicState() {
    const r = this.round;
    const revealed = this.phase !== PHASE.ACTIVE;
    return {
      roundId: r.id,
      phase: this.phase,
      board: r.board,
      gridSize: this.size,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      durations: this.config.phases,
      totalWords: r.solutions.length,
      maxScore: r.maxScore,
      players: r.players.size,
      lengthCounts: r.lengthCounts,
      solutions: revealed ? r.solutions : null,
      rankings: revealed ? r.rankings : null,
    };
  }

  /** Per-player progress, so reconnecting players get their words back. */
  playerProgress(playerId) {
    const entry = this.round?.players.get(playerId);
    return {
      roundId: this.roundId,
      joined: Boolean(entry),
      score: entry?.score ?? 0,
      words: entry ? [...entry.words].map(([word, points]) => ({ word, points })) : [],
    };
  }
}
