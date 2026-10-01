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

  // Soft delete (005-soft-delete, R-010): `Hospital.coordinator` is a real nested to-one relation,
  // not covered by the extension's read-filtering -- a `hospital: { coordinator: { isNot: null } } }`
  // filter and `hospital.coordinator.id` select would both still see a soft-deleted coordinator (and
  // notify a deleted account). The active coordinator per hospital is instead resolved through a
  // separate, correctly-filtered top-level query and joined in application code.
  const [overdueTrainings, upcomingVisits, coordinators] = await Promise.all([
    prisma.training.findMany({
      where: {
        status: { not: 'completed' },
        template: { dueDate: { lt: now } },
        hospital: { isActive: true },
      },
      select: { id: true, title: true, hospitalId: true },
    }),
    prisma.visit.findMany({
      where: {
        status: 'in_progress',
        visitDate: { gte: now, lte: windowEnd },
        hospital: { isActive: true },
      },
      select: { id: true, visitDate: true, hospitalId: true },
    }),
    prisma.user.findMany({ where: { role: 'hospital' }, select: { id: true, hospitalId: true } }),
  ]);
  const coordinatorByHospital = new Map(coordinators.map((c) => [c.hospitalId, c.id]));

  const candidates = [
    ...overdueTrainings
      .filter((t) => coordinatorByHospital.has(t.hospitalId))
      .map((t) => ({
        userId: coordinatorByHospital.get(t.hospitalId)!,
        type: 'training_overdue' as const,
        entityId: t.id,
        message: `التدريب المطلوب "${t.title}" متأخر عن موعده النهائي ولم يتم توثيقه بعد.`,
        link: '/trainings',
      })),
    ...upcomingVisits
      .filter((v) => coordinatorByHospital.has(v.hospitalId))
      .map((v) => ({
        userId: coordinatorByHospital.get(v.hospitalId)!,
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
