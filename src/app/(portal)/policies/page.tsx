import { requirePageUser } from '@/server/auth/session';
import { listPolicies } from '@/server/queries/library';
import { DocumentsView } from '@/components/views/DocumentsView';

export default async function PoliciesPage() {
  const user = await requirePageUser();
  const policies = await listPolicies();
  return <DocumentsView user={user} moduleType="policies" policies={policies} />;
}
