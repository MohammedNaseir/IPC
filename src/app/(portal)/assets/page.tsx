import { requirePageUser } from '@/server/auth/session';
import { listEquipments, listPractitioners, listTrashedEquipments, listTrashedPractitioners } from '@/server/queries/assets';
import { listHospitals } from '@/server/queries/hospitals';
import { AssetsView } from '@/components/views/AssetsView';

export default async function AssetsPage() {
  const user = await requirePageUser();
  const isCentral = user.role === 'central';
  const [practitioners, equipments, hospitals, trashedPractitioners, trashedEquipments] = await Promise.all([
    listPractitioners(user),
    listEquipments(user),
    listHospitals(user),
    // Trash is central-only (spec FR-005) -- no point fetching it for a hospital coordinator.
    isCentral ? listTrashedPractitioners() : Promise.resolve([]),
    isCentral ? listTrashedEquipments() : Promise.resolve([]),
  ]);

  return (
    <AssetsView
      user={user}
      practitioners={practitioners}
      equipments={equipments}
      hospitals={hospitals}
      trashedPractitioners={trashedPractitioners}
      trashedEquipments={trashedEquipments}
    />
  );
}
