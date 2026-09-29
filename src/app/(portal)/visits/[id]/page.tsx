import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/session';
import { findVisitForUser, listAuditLogsForVisit } from '@/server/queries/visits';
import { VisitDetailView } from '@/components/views/VisitDetailView';

/**
 * One visit's own page.
 *
 * The resolution order is the whole security property of this route, and it is deliberate:
 *
 * 1. the session guard runs first, so nothing is fetched for a signed-out caller;
 * 2. the visit is resolved with the caller's scope inside the query's `where` clause;
 * 3. `notFound()` fires before anything renders when the result is `null`.
 *
 * Step 3 covers "does not exist" and "not yours" with the same outcome, because `findVisitForUser`
 * cannot distinguish them either. Without that, this address would be an oracle for whether another
 * hospital's visit exists (FR-006, FR-007, FR-008).
 */
export default async function VisitRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;

  const visit = await findVisitForUser(user, id);
  if (!visit) notFound();

  const auditLogs = await listAuditLogsForVisit(user, visit.id);

  return <VisitDetailView user={user} visit={visit} auditLogs={auditLogs} />;
}
