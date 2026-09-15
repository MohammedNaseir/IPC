import 'server-only';
import type { SessionUser } from '@/lib/types';
import { AuthorizationError } from '@/server/errors';

// Prisma `where` fragment restricting hospital-owned rows to the caller's hospital. Central users are unrestricted.
export function hospitalScope(user: SessionUser): { hospitalId?: string } {
  return user.role === 'central' ? {} : { hospitalId: user.hospitalId! };
}

export function assertHospitalAccess(user: SessionUser, hospitalId: string): void {
  if (user.role !== 'central' && user.hospitalId !== hospitalId) {
    throw new AuthorizationError('غير مصرح لك بالوصول إلى بيانات مستشفى آخر.');
  }
}
