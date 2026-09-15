import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/server/db';

const UPCOMING_VISIT_WINDOW_DAYS = 3;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// FR-35 / FR-36 in-app reminders. Idempotent: each training/visit is reminded at most once.
export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response('Unauthorized', { status: 401 });

  const now = new Date();
  const windowEnd = new Date(now.getTime() + UPCOMING_VISIT_WINDOW_DAYS * 86_400_000);

  const [overdueTrainings, upcomingVisits] = await Promise.all([
    prisma.training.findMany({
      where: {
        status: { not: 'completed' },
        template: { dueDate: { lt: now } },
        hospital: { isActive: true, coordinator: { isNot: null } },
      },
      select: { id: true, title: true, hospital: { select: { coordinator: { select: { id: true } } } } },
    }),
    prisma.visit.findMany({
      where: {
        status: 'in_progress',
        visitDate: { gte: now, lte: windowEnd },
        hospital: { isActive: true, coordinator: { isNot: null } },
      },
      select: { id: true, visitDate: true, hospital: { select: { coordinator: { select: { id: true } } } } },
    }),
  ]);

  const candidates = [
    ...overdueTrainings.map((t) => ({
      userId: t.hospital.coordinator!.id,
      type: 'training_overdue' as const,
      entityId: t.id,
      message: `التدريب المطلوب "${t.title}" متأخر عن موعده النهائي ولم يتم توثيقه بعد.`,
      link: '/trainings',
    })),
    ...upcomingVisits.map((v) => ({
      userId: v.hospital.coordinator!.id,
      type: 'visit_upcoming' as const,
      entityId: `${v.id}:reminder`,
      message: `تذكير: زيارة رقابية مجدولة لمستشفاكم بتاريخ ${v.visitDate.toLocaleDateString('ar-SA')}.`,
      link: '/visits',
    })),
  ];
  if (candidates.length === 0) return Response.json({ created: 0 });

  const existing = await prisma.notification.findMany({
    where: { OR: candidates.map((c) => ({ type: c.type, entityId: c.entityId, userId: c.userId })) },
    select: { type: true, entityId: true, userId: true },
  });
  const seen = new Set(existing.map((n) => `${n.type}|${n.entityId}|${n.userId}`));
  const toCreate = candidates.filter((c) => !seen.has(`${c.type}|${c.entityId}|${c.userId}`));

  if (toCreate.length > 0) {
    await prisma.notification.createMany({ data: toCreate });
  }

  return Response.json({ created: toCreate.length });
}
