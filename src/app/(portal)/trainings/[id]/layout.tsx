import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/session';
import { trainingExistsForUser } from '@/server/queries/trainings';

/**
 * The training equivalent of the visit record layout: it settles the HTTP status before anything is
 * flushed, so a record that does not exist answers 404 rather than painting the not-found UI under a
 * 200 (research.md R-012).
 *
 * **Not the authorization check.** The page performs its own full scoped fetch and its own `notFound()`.
 */
export default async function TrainingRecordLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;

  if (!(await trainingExistsForUser(user, id))) notFound();

  return children;
}
