import { notFound } from 'next/navigation';
import { requirePageHospital } from '@/server/auth/session';
import { listHospitals } from '@/server/queries/hospitals';
import { listVisits } from '@/server/queries/visits';
import { listTrainings } from '@/server/queries/trainings';
import { listEquipments, listPractitioners } from '@/server/queries/assets';
import { HospitalProfileView } from '@/components/views/HospitalProfileView';

export default async function HospitalProfilePage() {
  const user = await requirePageHospital();
  const [hospitals, visits, trainings, practitioners, equipments] = await Promise.all([
    listHospitals(user),
    listVisits(user),
    listTrainings(user),
    listPractitioners(user),
    listEquipments(user),
  ]);

  const hospital = hospitals.find((h) => h.id === user.hospitalId);
  if (!hospital) notFound();

  return (
    <HospitalProfileView
      user={user}
      hospital={hospital}
      visits={visits}
      trainings={trainings}
      practitioners={practitioners}
      equipments={equipments}
    />
  );
}
