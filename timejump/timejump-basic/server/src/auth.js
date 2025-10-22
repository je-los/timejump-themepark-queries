import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = '12h';

export function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return Buffer.concat([salt, hash]); // store salt||hash
}
export function verifyPassword(plain, stored) {
  const salt = stored.subarray(0,16);
  const expect = stored.subarray(16);
  const hash = scryptSync(plain, salt, 64);
  return timingSafeEqual(expect, hash);
}
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
