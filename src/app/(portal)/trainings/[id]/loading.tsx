// FR-013 / SC-004: a record-shaped skeleton for the route transition. The training record has no
// attachment gallery unless evidence was uploaded, so the placeholder omits it.
import { RecordSkeleton } from '@/components/table/RecordSkeleton';

export default function Loading() {
  return <RecordSkeleton panels={4} gallery={false} />;
}
