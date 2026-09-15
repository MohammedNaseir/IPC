import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { AuthorizationError } from '@/server/errors';
import type { SessionUser } from '@/lib/types';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from '@/server/auth/token';

export async function createSession(user: {
  id: string;
  role: 'central' | 'hospital';
  hospitalId: string | null;
  sessionVersion: number;
}): Promise<void> {
  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    hospitalId: user.hospitalId,
    sessionVersion: user.sessionVersion,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// The token proves identity only; role, hospital and account state are always re-read from the database.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hospitalId: true,
      sessionVersion: true,
      hospital: { select: { name: true, isActive: true } },
    },
  });
  if (!user || user.sessionVersion !== claims.sessionVersion) return null;

  if (user.role === 'hospital') {
    if (!user.hospitalId || !user.hospital?.isActive) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'hospital',
      hospitalId: user.hospitalId,
      hospitalName: user.hospital.name,
    };
  }

  return { id: user.id, email: user.email, name: user.name, role: 'central', hospitalId: null, hospitalName: null };
});

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requirePageCentral(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (user.role !== 'central') redirect('/dashboard');
  return user;
}

export async function requirePageHospital(): Promise<SessionUser & { hospitalId: string }> {
  const user = await requirePageUser();
  if (user.role !== 'hospital' || !user.hospitalId) redirect('/dashboard');
  return { ...user, hospitalId: user.hospitalId };
}

export async function requireActionUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError('انتهت الجلسة. يرجى تسجيل الدخول مجدداً.');
  return user;
}

export async function requireActionCentral(): Promise<SessionUser> {
  const user = await requireActionUser();
  if (user.role !== 'central') throw new AuthorizationError('هذا الإجراء مقتصر على الإدارة المركزية.');
  return user;
}
