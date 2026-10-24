import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

/**
 * Milliseconds left in the current phase, computed from the server deadline
 * and the measured clock offset so every client shows the same time.
 * `smooth` uses requestAnimationFrame (for progress bars); otherwise 4 Hz.
 */
export function useCountdown({ smooth = false } = {}) {
  const { state, clockOffset } = useGame();
  const deadline = state?.phaseEndsAt ?? 0;
  const calc = () => Math.max(0, deadline - (Date.now() + clockOffset));
  const [msLeft, setMsLeft] = useState(calc);

  useEffect(() => {
    let id;
    const tick = () => {
      setMsLeft(calc());
      id = smooth ? requestAnimationFrame(tick) : setTimeout(tick, 250);
    };
    tick();
    return () => (smooth ? cancelAnimationFrame(id) : clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, clockOffset, smooth]);

  return msLeft;
}
