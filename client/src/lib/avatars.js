export const AVATAR_PRESETS = [
  { id: 'lisica', emoji: '🦊', bg: '#ffd9c4' },
  { id: 'medvjed', emoji: '🐻', bg: '#ead8c7' },
  { id: 'sova', emoji: '🦉', bg: '#e3dccf' },
  { id: 'zaba', emoji: '🐸', bg: '#cdf1d6' },
  { id: 'macka', emoji: '🐱', bg: '#ffe7b0' },
  { id: 'pas', emoji: '🐶', bg: '#f3e1cc' },
  { id: 'zec', emoji: '🐰', bg: '#f6dcef' },
  { id: 'pcela', emoji: '🐝', bg: '#fff1a8' },
  { id: 'hobotnica', emoji: '🐙', bg: '#ffd0dc' },
  { id: 'dupin', emoji: '🐬', bg: '#cde9ff' },
  { id: 'jez', emoji: '🦔', bg: '#e6dbd2' },
  { id: 'kornjaca', emoji: '🐢', bg: '#d6f0c8' },
];

export const DEFAULT_AVATAR = AVATAR_PRESETS[0].id;

export function resolveAvatar(value) {
  // Uploaded pictures: absolute URLs, or images hosted by the game server.
  if (typeof value === 'string' && /^(https?:\/\/|\/api\/avatars\/)/.test(value)) return { url: value };
  return AVATAR_PRESETS.find((p) => p.id === value) || AVATAR_PRESETS[0];
}
