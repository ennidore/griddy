// Light vibration feedback on phones that support the Vibration API
// (Android browsers). iPhone browsers don't expose vibration, so this is a no-op there.

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function vibrate(pattern) {
  if (!canVibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* blocked (e.g. no user gesture yet): ignore */
  }
}

export const haptics = {
  tile: () => vibrate(8), // each letter connected: a barely-there tick
  back: () => vibrate(5),
  valid: () => vibrate([12, 40, 12]), // two quick taps
  duplicate: () => vibrate(10),
  invalid: () => vibrate(28), // one slightly longer buzz
};
