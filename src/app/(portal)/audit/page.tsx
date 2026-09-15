import { requirePageCentral } from '@/server/auth/session';
import { listRecentAuditLogs } from '@/server/queries/system';
import { AuditView } from '@/components/views/AuditView';

export default async function AuditPage() {
  await requirePageCentral();
  const auditLogs = await listRecentAuditLogs();

  return <AuditView auditLogs={auditLogs} />;
}
