import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/session';
import { findTrainingForUser } from '@/server/queries/trainings';
import { TrainingDetailView } from '@/components/views/TrainingDetailView';

/**
 * One training's own page. Same resolution order as the visit record page, and for the same reason:
 * guard, resolve with the caller's scope inside the `where` clause, then `notFound()` before rendering
 * when the result is `null` — identically for "does not exist" and "not yours" (FR-006, FR-007, FR-008).
 */
export default async function TrainingRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;

  const training = await findTrainingForUser(user, id);
  if (!training) notFound();

  return <TrainingDetailView training={training} />;
}
