import type { TrainingDTO } from '@/lib/types';

// Shared by the trainings list and the training record page, which must badge a status identically.
export function statusBadgeClass(status: TrainingDTO['status']): string {
  if (status === 'completed') return 'bg-navy-50 text-navy-700 border border-navy-200';
  if (status === 'late') return 'bg-danger-50 text-danger-700 border border-danger-200';
  return 'bg-attn-50 text-attn-700 border border-attn-200';
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
