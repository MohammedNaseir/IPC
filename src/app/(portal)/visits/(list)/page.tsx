import { requirePageUser } from '@/server/auth/session';
import { listVisits } from '@/server/queries/visits';
import { listHospitals } from '@/server/queries/hospitals';
import { VisitsView } from '@/components/views/VisitsView';

export default async function VisitsPage() {
  const user = await requirePageUser();
  // The audit trail moved to the record page with the detail panel, so this route no longer fetches it.
  const [visits, hospitals] = await Promise.all([listVisits(user), listHospitals(user)]);

  return <VisitsView user={user} visits={visits} hospitals={hospitals} />;
}
