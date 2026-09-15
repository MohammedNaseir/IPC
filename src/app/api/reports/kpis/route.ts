import { prisma } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';
import { deriveTrainingStatus } from '@/server/queries/trainings';
import { averageCompliance } from '@/lib/format';

function parseDay(value: string | null, endOfDay: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Prevents spreadsheet formula injection from user-entered names.
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// FR-43: central-only KPI export for a date range, as UTF-8 CSV that opens directly in Excel.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'central') return new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const from = parseDay(url.searchParams.get('from'), false);
  const to = parseDay(url.searchParams.get('to'), true);
  if (!from || !to || from > to) {
    return new Response('Invalid date range. Use ?from=YYYY-MM-DD&to=YYYY-MM-DD', { status: 400 });
  }

  const hospitals = await prisma.hospital.findMany({
    orderBy: { name: 'asc' },
    include: {
      visits: { where: { visitDate: { gte: from, lte: to } }, select: { status: true, complianceScore: true } },
      trainings: {
        select: { status: true, date: true, createdAt: true, template: { select: { dueDate: true } } },
      },
    },
  });

  const now = new Date();
  const header = [
    'المستشفى',
    'نوع المنشأة',
    'الموقع',
    'الحالة',
    'الزيارات خلال الفترة',
    'الزيارات المكتملة خلال الفترة',
    'متوسط نسبة الامتثال % (الزيارات المكتملة)',
    'التدريبات المنفذة خلال الفترة',
    'التدريبات المتأخرة حالياً',
  ];
  const rows = hospitals.map((h) => {
    const completed = h.visits.filter((v) => v.status === 'completed');
    const avg = averageCompliance(completed.map((v) => v.complianceScore));
    const trainingsDone = h.trainings.filter(
      (t) => t.status === 'completed' && t.date && t.date >= from && t.date <= to,
    ).length;
    const lateNow = h.trainings.filter(
      (t) => deriveTrainingStatus(t.status, t.template?.dueDate ?? null, now) === 'late',
    ).length;
    return [
      h.name,
      h.type,
      h.location,
      h.isActive ? 'مفعل' : 'معطل',
      h.visits.length,
      completed.length,
      avg ?? '',
      trainingsDone,
      lateNow,
    ];
  });

  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const fileName = `IPC_KPIs_${url.searchParams.get('from')}_${url.searchParams.get('to')}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
