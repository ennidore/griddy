import { AVATAR_PRESETS } from '../lib/avatars.js';

export default function AvatarPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATAR_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          style={{ background: p.bg }}
          className={`grid aspect-square place-items-center rounded-md text-2xl transition active:scale-90 ${
            value === p.id ? 'ring-3 ring-grape ring-offset-2' : ''
          }`}
          aria-label={p.id}
        >
          {p.emoji}
        </button>
      ))}
    </div>
  );
}
