import { requirePageUser } from '@/server/auth/session';
import { listHospitals } from '@/server/queries/hospitals';
import { listVisits } from '@/server/queries/visits';
import { listTrainings } from '@/server/queries/trainings';
import { DashboardView } from '@/components/views/DashboardView';

export default async function DashboardPage() {
  const user = await requirePageUser();
  const [hospitals, visits, trainings] = await Promise.all([
    listHospitals(user),
    listVisits(user),
    listTrainings(user),
  ]);

  return <DashboardView user={user} hospitals={hospitals} visits={visits} trainings={trainings} />;
}
