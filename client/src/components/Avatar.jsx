import { resolveAvatar } from '../lib/avatars.js';

/** Avatar with a green/grey online dot. */
export function PresenceAvatar({ value, online, size = 44 }) {
  return (
    <span className="relative shrink-0">
      <Avatar value={value} size={size} />
      <span
        className={`absolute right-0 bottom-0 size-3 rounded-full border-2 border-surface ${
          online ? 'bg-mint' : 'bg-ink-soft/40'
        }`}
      />
    </span>
  );
}

export default function Avatar({ value, size = 36, className = '' }) {
  const a = resolveAvatar(value);
  const style = { width: size, height: size };

  if (a.url) {
    return <img src={a.url} alt="" style={style} className={`shrink-0 rounded-md object-cover ${className}`} />;
  }
  return (
    <span
      style={{ ...style, background: a.bg, fontSize: size * 0.55 }}
      className={`grid shrink-0 place-items-center rounded-md leading-none ${className}`}
      aria-hidden
    >
      {a.emoji}
    </span>
  );
}
