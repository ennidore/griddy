// Sound engine + background music: "The Tenth Move", looped seamlessly with the Web Audio API.
// Game effects (lib/sfx.js) play through the same context and the same on/off switch.
//
// The audio file was prepared so the jump from LOOP_END back to LOOP_START is
// inaudible: both points sit on the same downbeat (119.73 BPM, 160 beats apart)
// and a 1 s equal-power crossfade into the intro is baked into the file's tail.
// It plays from 0 once, then loops [LOOP_START, LOOP_END) forever.
//
// The track keeps running underneath; fading only moves a gain node, so when
// music comes back it continues where it was instead of restarting.

const SOURCES = ['/audio/the-tenth-move.m4a', '/audio/the-tenth-move.webm'];
const LOOP_START = 47297 / 44100; // s, first downbeat + crossfade length
const LOOP_END = 3583265 / 44100; // s, end of the crossfade (= file end)
const VOLUME = 0.35; // the master is loud; keep music in the background
const SFX_VOLUME = 0.6; // game sound effects (lib/sfx.js)
const FADE_OUT_S = 1.2; // when a round starts
const FADE_IN_S = 2.5; // when a round ends / leaving the game
const STORAGE_KEY = 'griddy.sound';
const LEGACY_STORAGE_KEY = 'griddy.music';

// Graph:  source → fadeGain → musicGain ─┐
//                              sfxBus ───┼→ soundGain (mute toggle) → speakers
let ctx = null;
let buffer = null;
let source = null;
let fadeGain = null; // follows the game (in round → 0); music only
let soundGain = null; // follows the sound toggle; music and effects
let sfxBus = null;
let inRound = false;
let hidden = typeof document !== 'undefined' && document.hidden;
let enabled = readEnabled();
const listeners = new Set();

function readEnabled() {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)) !== 'off';
  } catch {
    return true;
  }
}

async function loadBuffer() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      /* format not supported here: try the next one */
    }
  }
  return null;
}

function setup() {
  if (ctx || typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  soundGain = ctx.createGain();
  soundGain.gain.value = enabled ? 1 : 0;
  soundGain.connect(ctx.destination);
  const musicGain = ctx.createGain();
  musicGain.gain.value = VOLUME;
  musicGain.connect(soundGain);
  fadeGain = ctx.createGain();
  fadeGain.gain.value = 0;
  fadeGain.connect(musicGain);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = SFX_VOLUME;
  sfxBus.connect(soundGain);
  const owner = ctx;
  loadBuffer().then((b) => {
    if (ctx !== owner) return; // disposed (hot reload) while loading
    buffer = b;
    startSource();
  });
}

function startSource() {
  if (!ctx || !buffer || source || ctx.state !== 'running') return;
  source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = LOOP_START;
  source.loopEnd = Math.min(LOOP_END, buffer.duration);
  source.connect(fadeGain);
  source.start();
  applyFade(true);
}

/** Ramp the game-driven gain toward its target. */
function applyFade(initial = false) {
  if (!ctx || !fadeGain) return;
  const target = inRound || hidden ? 0 : 1;
  const now = ctx.currentTime;
  const g = fadeGain.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  const seconds = target === 0 ? (hidden ? 0.3 : FADE_OUT_S) : initial ? 1.5 : FADE_IN_S;
  g.linearRampToValueAtTime(target, now + seconds);
}

// Browsers only allow audio after a user gesture: unlock on the first one.
function unlock() {
  setup();
  if (!ctx) return;
  ctx.resume().then(startSource).catch(() => {});
}

// Quiet when the app is in the background (phone locked, other tab).
function onVisibilityChange() {
  hidden = document.hidden;
  if (!ctx) return;
  if (hidden) {
    applyFade();
    setTimeout(() => document.hidden && ctx?.suspend().catch(() => {}), 400);
  } else {
    ctx.resume().then(() => {
      startSource();
      applyFade();
    }).catch(() => {});
  }
}

const GESTURES = ['pointerdown', 'keydown', 'touchend'];
const GESTURE_OPTS = { capture: true, passive: true }; // capture: runs before the app handles the tap

if (typeof window !== 'undefined') {
  // Kept for every gesture (cheap and idempotent) in case the first one came before setup finished.
  GESTURES.forEach((type) => window.addEventListener(type, unlock, GESTURE_OPTS));
  document.addEventListener('visibilitychange', onVisibilityChange);
}

// Only ever one player per page. In development, Vite hot-reloads this module on
// every edit; without this the old copy keeps playing (and keeps reacting to taps),
// and two copies a few milliseconds apart sound like a metallic buzz.
function dispose() {
  if (typeof window === 'undefined') return;
  GESTURES.forEach((type) => window.removeEventListener(type, unlock, GESTURE_OPTS));
  document.removeEventListener('visibilitychange', onVisibilityChange);
  try {
    source?.stop();
  } catch {
    /* already stopped */
  }
  ctx?.close().catch(() => {});
  ctx = null;
  source = null;
}
// Each fresh copy shuts down the previous one as it loads. (Vite's own dispose hook
// doesn't run here: this module is replaced through its importers, not on its own.)
if (typeof window !== 'undefined') {
  window.__griddySoundDispose?.();
  window.__griddySoundDispose = dispose;
}

export const music = {
  /** true while the player is playing a round: music fades out. */
  setInRound(value) {
    if (inRound === value) return;
    inRound = value;
    applyFade();
  },

  isEnabled: () => enabled,

  setEnabled(value) {
    enabled = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    if (soundGain && ctx) {
      const now = ctx.currentTime;
      soundGain.gain.cancelScheduledValues(now);
      soundGain.gain.setValueAtTime(soundGain.gain.value, now);
      soundGain.gain.linearRampToValueAtTime(value ? 1 : 0, now + 0.4);
    }
    if (value) unlock();
    listeners.forEach((fn) => fn());
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Audio context + effects bus for lib/sfx.js, or null until audio is unlocked. */
  sfxOutput() {
    if (!ctx || ctx.state !== 'running' || !enabled) return null;
    return { ctx, bus: sfxBus };
  },

  /** For debugging/tests: current state of the engine. */
  debug: () => ({
    context: ctx?.state ?? 'none',
    loaded: Boolean(buffer),
    playing: Boolean(source),
    inRound,
    enabled,
    fadeGain: fadeGain ? Number(fadeGain.gain.value.toFixed(3)) : null,
    loop: buffer ? [Number(LOOP_START.toFixed(4)), Number(Math.min(LOOP_END, buffer.duration).toFixed(4)), Number(buffer.duration.toFixed(4))] : null,
  }),
};

// Development only: inspect the player from the browser console (__griddyMusic.debug()).
if (import.meta.env?.DEV && typeof window !== 'undefined') window.__griddyMusic = music;
