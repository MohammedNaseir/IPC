import { getCurrentUser } from '@/server/auth/session';
import { ATTENDANCE_TEMPLATE_HEADER } from '@/lib/attendance';

const FILE_NAME = 'attendance-template.csv';

// FR-010: the attendance import template. Served as UTF-8 CSV with a BOM so Excel opens it directly
// with the Arabic header intact; the import accepts .csv as well as .xlsx, so no writer is needed.
// The header comes from the same constant the parser validates against, so the two cannot drift.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = `﻿${ATTENDANCE_TEMPLATE_HEADER}\r\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${FILE_NAME}"; filename*=UTF-8''${encodeURIComponent(FILE_NAME)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
