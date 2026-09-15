import 'server-only';
import { refresh } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import type { ActionResult } from '@/lib/action-result';
import { UserFacingError } from '@/server/errors';

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'البيانات المدخلة غير صالحة.' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, error: 'القيمة المدخلة مستخدمة مسبقاً في سجل آخر.' };
    }
    console.error('[server action]', error);
    return { ok: false, error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' };
  }
}
