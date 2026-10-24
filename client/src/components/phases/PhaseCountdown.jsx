import { useCountdown } from '../../hooks/useCountdown.js';

export default function PhaseCountdown({ label }) {
  const msLeft = useCountdown();
  return (
    <span className="shrink-0 rounded-md bg-paper whitespace-nowrap px-3 py-1 text-xs font-extrabold text-ink-soft tabular-nums">
      {label} {Math.ceil(msLeft / 1000)} s
    </span>
  );
}
