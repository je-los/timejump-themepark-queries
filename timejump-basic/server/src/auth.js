import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = '12h';

export function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return Buffer.concat([salt, hash]); // store salt||hash
}
export function verifyPassword(plain, stored) {
  const buf = Buffer.isBuffer(stored) ? stored : Buffer.from(stored ?? []);
  if (!buf.length) {
    return { ok: false, needsRehash: true };
  }
  if (buf.length === 16 + 64) {
    const salt = buf.subarray(0, 16);
    const expect = buf.subarray(16);
    const hash = scryptSync(plain, salt, 64);
    return { ok: timingSafeEqual(expect, hash), needsRehash: false };
  }
  if (buf.length === 32) {
    const sha256 = createHash('sha256').update(plain).digest();
    const ok = timingSafeEqual(sha256, buf);
    return { ok, needsRehash: ok };
  }
  if (buf.length === 20) {
    const sha1 = createHash('sha1').update(plain).digest();
    const ok = timingSafeEqual(sha1, buf);
    return { ok, needsRehash: ok };
  }
  return { ok: false, needsRehash: true };
}
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
