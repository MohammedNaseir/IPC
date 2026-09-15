import { requirePageUser } from '@/server/auth/session';
import { listTrainings } from '@/server/queries/trainings';
import { listHospitals } from '@/server/queries/hospitals';
import { listPractitioners } from '@/server/queries/assets';
import { TrainingsView } from '@/components/views/TrainingsView';

export default async function TrainingsPage() {
  const user = await requirePageUser();
  const [trainings, hospitals, practitioners] = await Promise.all([
    listTrainings(user),
    listHospitals(user),
    listPractitioners(user),
  ]);

  return <TrainingsView user={user} trainings={trainings} hospitals={hospitals} practitioners={practitioners} />;
}
