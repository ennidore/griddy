// Game sound effects, synthesized with the Web Audio API (no audio files).
// They share the music's audio context and the sound on/off toggle (lib/music.js),
// and are silent until the browser has allowed audio (first tap/click).

import { music } from './music.js';

// C major pentatonic from C5 upwards: any run of connected letters sounds melodic.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
const noteFor = (n) => SCALE[Math.min(Math.max(n - 1, 0), SCALE.length - 1)];

/** One soft plucked tone: fast attack, exponential decay, gentle low-pass. */
function pluck(out, { freq, start = 0, duration = 0.16, volume = 0.22, type = 'triangle', glideTo = null }) {
  const { ctx, bus } = out;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(freq * 4, 9000);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(filter).connect(env).connect(bus);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function withOutput(fn) {
  const out = music.sfxOutput();
  if (out) fn(out);
}

export const sfx = {
  /** A letter joined the path; `n` = path length so far (pitch rises with it). */
  tile(n) {
    withOutput((out) => {
      pluck(out, { freq: noteFor(n), duration: 0.14, volume: 0.2 });
      pluck(out, { freq: noteFor(n) * 2, duration: 0.06, volume: 0.04, type: 'sine' }); // a little sparkle
    });
  },

  /** Dragged back onto the previous letter. */
  back(n) {
    withOutput((out) => pluck(out, { freq: noteFor(n) * 0.75, duration: 0.07, volume: 0.1, type: 'sine' }));
  },

  /** Word accepted: a quick rising arpeggio, longer for longer words. */
  valid(length) {
    withOutput((out) => {
      const notes = Math.min(Math.max(length - 1, 2), 6);
      for (let i = 0; i < notes; i++) {
        pluck(out, { freq: noteFor(3 + i * 2), start: i * 0.055, duration: 0.22, volume: 0.18 });
      }
      pluck(out, { freq: noteFor(3 + (notes - 1) * 2) * 2, start: notes * 0.055, duration: 0.35, volume: 0.06, type: 'sine' });
    });
  },

  /** Already found this word: two soft, level notes. */
  duplicate() {
    withOutput((out) => {
      pluck(out, { freq: 659.25, duration: 0.1, volume: 0.12 });
      pluck(out, { freq: 659.25, start: 0.1, duration: 0.12, volume: 0.1 });
    });
  },

  /** Not a word: a short, low, falling thud. */
  invalid() {
    withOutput((out) => {
      pluck(out, { freq: 196, glideTo: 130, duration: 0.18, volume: 0.22, type: 'triangle' });
      pluck(out, { freq: 98, glideTo: 70, duration: 0.2, volume: 0.12, type: 'sine' });
    });
  },
};
