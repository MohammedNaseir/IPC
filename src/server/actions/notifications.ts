'use server';

import { prisma } from '@/server/db';
import { requireActionUser } from '@/server/auth/session';
import { runAction } from '@/server/run-action';
import { idSchema } from '@/server/validation';

export async function markNotificationRead(notificationId: string) {
  return runAction(async () => {
    const user = await requireActionUser();
    const id = idSchema.parse(notificationId);
    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } });
    return null;
  });
}
