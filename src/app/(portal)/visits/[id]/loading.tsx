// FR-013 / SC-004: the perceptible wait on a record page is the route transition, and this is where it
// shows. A record-shaped skeleton, not the table skeleton the list routes use.
import { RecordSkeleton } from '@/components/table/RecordSkeleton';

export default function Loading() {
  return <RecordSkeleton panels={3} gallery />;
}
