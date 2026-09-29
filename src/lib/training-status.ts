import type { TrainingDTO } from '@/lib/types';

// Shared by the trainings list and the training record page, which must badge a status identically.
export function statusBadgeClass(status: TrainingDTO['status']): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'late') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

export function statusLabel(status: TrainingDTO['status']): string {
  if (status === 'completed') return 'مكتمل وموثق';
  if (status === 'late') return 'متأخر (تجاوز الموعد)';
  return 'معلّق بالانتظار';
}

/** The longer wording the record page uses, kept distinct from the list's compact label. */
export function statusDetailLabel(status: TrainingDTO['status']): string {
  if (status === 'completed') return 'مكتمل وموثق رسمياً';
  if (status === 'late') return 'متأخر عن الموعد المحدد';
  return 'معلّق بانتظار تنفيذ المستشفى';
}
