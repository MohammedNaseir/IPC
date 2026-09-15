'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { verifyPassword } from '@/server/auth/password';
import { createSession, destroySession, getCurrentUser } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { formString } from '@/server/validation';

export interface LoginState {
  error: string | null;
}

const INVALID_CREDENTIALS = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = (formString(formData, 'email') ?? '').trim().toLowerCase();
  const password = formString(formData, 'password') ?? '';

  if (!email || !password) {
    return { error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' };
  }
  if (email.length > 254) {
    return { error: INVALID_CREDENTIALS };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      role: true,
      hospitalId: true,
      passwordHash: true,
      sessionVersion: true,
      hospital: { select: { isActive: true } },
    },
  });

  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !passwordMatches) {
    return { error: INVALID_CREDENTIALS };
  }

  if (user.role === 'hospital' && !user.hospital?.isActive) {
    return { error: 'حساب المستشفى معطل حالياً. يرجى التواصل مع الإدارة المركزية.' };
  }

  await createSession({
    id: user.id,
    role: user.role,
    hospitalId: user.role === 'hospital' ? user.hospitalId : null,
    sessionVersion: user.sessionVersion,
  });
  await logAudit(prisma, user, 'User', user.id, 'تسجيل دخول إلى النظام');

  redirect('/dashboard');
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAudit(prisma, user, 'User', user.id, 'تسجيل خروج من النظام');
  }
  await destroySession();
  redirect('/login');
}
