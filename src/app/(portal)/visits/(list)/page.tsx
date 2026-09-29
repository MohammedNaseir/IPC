import { requirePageUser } from '@/server/auth/session';
import { listVisitAuditLogs, listVisits } from '@/server/queries/visits';
import { listHospitals } from '@/server/queries/hospitals';
import { VisitsView } from '@/components/views/VisitsView';

export default async function VisitsPage() {
  const user = await requirePageUser();
  const [visits, hospitals, auditLogs] = await Promise.all([
    listVisits(user),
    listHospitals(user),
    listVisitAuditLogs(user),
  ]);

  return <VisitsView user={user} visits={visits} hospitals={hospitals} auditLogs={auditLogs} />;
}
