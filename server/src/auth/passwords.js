import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

/** scrypt hash with a random salt → "salt:hash" (both hex). */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, KEY_LEN);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hex] = String(stored || '').split(':');
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/** Opaque session token for the client; only its SHA-256 is stored. */
export const newSessionToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

// Letters (incl. Croatian), digits, underscore, dot and dash; 3–20 characters.
export const USERNAME_RE = /^[\p{L}\d_.-]{3,20}$/u;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 100;

export function validateCredentials(username, password) {
  const name = String(username || '').trim();
  if (!USERNAME_RE.test(name)) return { ok: false, reason: 'bad_username' };
  const pw = String(password || '');
  if (pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX) return { ok: false, reason: 'bad_password' };
  return { ok: true, username: name, password: pw };
}
