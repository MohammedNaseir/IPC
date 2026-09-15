import 'server-only';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { ValidationError } from '@/server/errors';

const BCRYPT_COST = 12;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt silently ignores input beyond 72 bytes; reject instead of truncating.
const PASSWORD_MAX_BYTES = 72;

export function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new ValidationError(`كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN_LENGTH} أحرف.`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new ValidationError('كلمة المرور طويلة جداً.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  return bcrypt.hash(password, BCRYPT_COST);
}

let timingDummyHash: Promise<string> | null = null;

// Compares against a throwaway hash when the account doesn't exist, so response time doesn't reveal valid emails.
export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return false;
  if (!passwordHash) {
    timingDummyHash ??= bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_COST);
    await bcrypt.compare(password, await timingDummyHash);
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}
