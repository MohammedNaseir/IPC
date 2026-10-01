import 'server-only';
import type { ExtendedTransactionClient } from '@/server/db';
import { ValidationError } from '@/server/errors';
import {
  ATTENDEE_NAME_MAX_LENGTH,
  HEADCOUNT_MAX,
  HEADCOUNT_MIN,
  MAX_ATTENDEE_NAMES,
} from '@/lib/attendance';

export type AttendanceInput = { mode: 'names'; names: string[] } | { mode: 'headcount'; headcount: number };

export function normalizeAttendeeName(raw: string, position?: number): string {
  const name = raw.trim();
  const where = position === undefined ? '' : ` (الصف ${position})`;
  if (!name) throw new ValidationError(`اسم الحاضر لا يمكن أن يكون فارغاً${where}.`);
  if (name.length > ATTENDEE_NAME_MAX_LENGTH) {
    throw new ValidationError(`اسم الحاضر يتجاوز ${ATTENDEE_NAME_MAX_LENGTH} حرفاً${where}.`);
  }
  return name;
}

export function assertNameCount(count: number): void {
  if (count === 0) throw new ValidationError('يرجى إدخال اسم حاضر واحد على الأقل.');
  if (count > MAX_ATTENDEE_NAMES) {
    throw new ValidationError(`عدد الأسماء (${count}) يتجاوز الحد المسموح (${MAX_ATTENDEE_NAMES} اسماً).`);
  }
}

// Parses the attendance half of an execution submission. Attendance is a name list XOR a headcount;
// a submission carrying the removed practitioner linkage is refused outright rather than ignored
// (FR-005), so a stale client cannot appear to succeed while recording nothing.
export function parseAttendanceInput(formData: FormData): AttendanceInput {
  if (formData.has('practitionerIds') || formData.has('practitionerId')) {
    throw new ValidationError(
      'لم يعد ربط الحضور بسجل الممارسين مدعوماً. يرجى تحديث الصفحة وإدخال أسماء الحاضرين أو إجمالي العدد.',
    );
  }

  const rawNames = formData.getAll('attendeeNames').filter((v): v is string => typeof v === 'string');
  const names = rawNames.map((v) => v.trim()).filter((v) => v.length > 0);
  const rawHeadcount = formData.get('headcount');
  const headcountText = typeof rawHeadcount === 'string' ? rawHeadcount.trim() : '';

  const mode = formData.get('mode');
  if (mode !== 'names' && mode !== 'headcount') {
    throw new ValidationError('يرجى تحديد طريقة تسجيل الحضور: أسماء الحاضرين أو إجمالي العدد.');
  }

  if (mode === 'names' && headcountText) {
    throw new ValidationError('لا يمكن تسجيل أسماء الحاضرين وإجمالي العدد معاً. اختر إحدى الطريقتين.');
  }
  if (mode === 'headcount' && names.length > 0) {
    throw new ValidationError('لا يمكن تسجيل أسماء الحاضرين وإجمالي العدد معاً. اختر إحدى الطريقتين.');
  }

  if (mode === 'names') {
    assertNameCount(names.length);
    return { mode: 'names', names: names.map((name, i) => normalizeAttendeeName(name, i + 1)) };
  }

  if (!headcountText) throw new ValidationError('يرجى إدخال إجمالي عدد الحضور.');
  const headcount = Number(headcountText);
  if (!Number.isInteger(headcount) || headcount < HEADCOUNT_MIN || headcount > HEADCOUNT_MAX) {
    throw new ValidationError(`إجمالي عدد الحضور يجب أن يكون رقماً صحيحاً بين ${HEADCOUNT_MIN} و ${HEADCOUNT_MAX}.`);
  }
  return { mode: 'headcount', headcount };
}

// Replaces a training's whole attendance set in one step, so a training never holds a headcount row
// and name rows at the same time (FR-015).
//
// The training row is locked first. Without it, two overlapping saves both delete the pre-existing
// rows (neither sees the other's uncommitted delete under READ COMMITTED) and then both insert,
// merging the two sets — observed in verification as a 2-name save and a 3-name save producing 5
// rows. The lock serialises attendance writes per training so the later save replaces rather than
// merges.
export async function replaceAttendance(
  tx: ExtendedTransactionClient,
  trainingId: string,
  input: AttendanceInput,
): Promise<number> {
  await tx.$queryRaw`SELECT id FROM "Training" WHERE id = ${trainingId} FOR UPDATE`;
  await tx.trainingAttendance.deleteMany({ where: { trainingId } });
  if (input.mode === 'names') {
    await tx.trainingAttendance.createMany({
      data: input.names.map((attendeeName) => ({ trainingId, attendeeName })),
    });
    return input.names.length;
  }
  await tx.trainingAttendance.create({ data: { trainingId, headcount: input.headcount } });
  return input.headcount;
}
