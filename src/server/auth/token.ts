import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'ipc_session';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const ISSUER = 'ipc-portal';
const AUDIENCE = 'ipc-portal';

export type SessionRole = 'central' | 'hospital';

export interface SessionClaims {
  userId: string;
  role: SessionRole;
  hospitalId: string | null;
  sessionVersion: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, hid: claims.hospitalId, sv: claims.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const { sub, role, hid, sv } = payload;
    if (typeof sub !== 'string' || (role !== 'central' && role !== 'hospital') || typeof sv !== 'number') {
      return null;
    }
    if (role === 'hospital' && typeof hid !== 'string') return null;
    return { userId: sub, role, hospitalId: role === 'hospital' ? (hid as string) : null, sessionVersion: sv };
  } catch {
    return null;
  }
}
