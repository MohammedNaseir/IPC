import { requirePageCentral } from '@/server/auth/session';
import { listHospitals } from '@/server/queries/hospitals';
import { listVisits } from '@/server/queries/visits';
import { listTrainings } from '@/server/queries/trainings';
import { listEquipments, listPractitioners } from '@/server/queries/assets';
import { HospitalsView } from '@/components/views/HospitalsView';

export default async function HospitalsPage() {
  const user = await requirePageCentral();
  const [hospitals, visits, trainings, practitioners, equipments] = await Promise.all([
    listHospitals(user),
    listVisits(user),
    listTrainings(user),
    listPractitioners(user),
    listEquipments(user),
  ]);

  return (
    <HospitalsView
      hospitals={hospitals}
      visits={visits}
      trainings={trainings}
      practitioners={practitioners}
      equipments={equipments}
    />
  );
}
