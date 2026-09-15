import { requirePageUser } from '@/server/auth/session';
import { listEquipments, listPractitioners } from '@/server/queries/assets';
import { listHospitals } from '@/server/queries/hospitals';
import { AssetsView } from '@/components/views/AssetsView';

export default async function AssetsPage() {
  const user = await requirePageUser();
  const [practitioners, equipments, hospitals] = await Promise.all([
    listPractitioners(user),
    listEquipments(user),
    listHospitals(user),
  ]);

  return <AssetsView user={user} practitioners={practitioners} equipments={equipments} hospitals={hospitals} />;
}
