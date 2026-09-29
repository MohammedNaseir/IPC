import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/session';
import { visitExistsForUser } from '@/server/queries/visits';

/**
 * Settles the HTTP status before anything is flushed.
 *
 * A `loading.tsx` creates a Suspense boundary over its segment and every child segment. While the visits
 * list's skeleton sat at `visits/loading.tsx`, it covered `[id]` too, so Next flushed a `200` shell
 * before the record page's `await` resolved and `notFound()` could only paint the not-found UI under a
 * success status. The list now sits in a `(list)` route group so that boundary no longer reaches here,
 * and this layout — which resolves above the record page's own boundary — makes the 404 decision while
 * the status can still be set (research.md R-012).
 *
 * **This is not the authorization check.** It is a cheap scoped `select id` for the status code only.
 * The page below performs its own full scoped fetch with `hospitalScope(user)` inside the `where` clause
 * and its own `notFound()`. Deleting this file must cost a correct status, never a correct refusal.
 */
export default async function VisitRecordLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;

  if (!(await visitExistsForUser(user, id))) notFound();

  return children;
}
