import 'server-only';
import type { NotificationType, Prisma } from '@/generated/prisma/client';

interface NotificationPayload {
  type: NotificationType;
  message: string;
  link?: string;
  entityId?: string;
}

export async function notifyUsers(
  tx: Prisma.TransactionClient,
  userIds: string[],
  payload: NotificationPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  await tx.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...payload })),
  });
}

export async function notifyHospitalCoordinator(
  tx: Prisma.TransactionClient,
  hospitalId: string,
  payload: NotificationPayload,
): Promise<void> {
  const coordinator = await tx.user.findUnique({ where: { hospitalId }, select: { id: true } });
  if (coordinator) await notifyUsers(tx, [coordinator.id], payload);
}

// Central users plus coordinators of active hospitals, optionally excluding the actor.
export async function notifyAllActiveUsers(
  tx: Prisma.TransactionClient,
  payload: NotificationPayload,
  excludeUserId?: string,
): Promise<void> {
  const users = await tx.user.findMany({
    where: {
      id: excludeUserId ? { not: excludeUserId } : undefined,
      OR: [{ role: 'central' }, { role: 'hospital', hospital: { isActive: true } }],
    },
    select: { id: true },
  });
  await notifyUsers(
    tx,
    users.map((u) => u.id),
    payload,
  );
}
