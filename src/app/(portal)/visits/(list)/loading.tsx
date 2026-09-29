// FR-013: the perceptible wait on this screen is the route transition, which Next.js renders with this
// file (research.md R-006). No screen fetches on the client, so there is no in-component loading phase.
import { TableSkeleton } from '@/components/table/TableSkeleton';

export default function Loading() {
  return <TableSkeleton columns={6} />;
}
