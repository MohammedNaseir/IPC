import { requirePageUser } from '@/server/auth/session';
import { listPolicies, listTrashedPolicies } from '@/server/queries/library';
import { DocumentsView } from '@/components/views/DocumentsView';

export default async function PoliciesPage() {
  const user = await requirePageUser();
  const isCentral = user.role === 'central';
  const [policies, trashedPolicies] = await Promise.all([
    listPolicies(),
    isCentral ? listTrashedPolicies() : Promise.resolve([]),
  ]);
  return <DocumentsView user={user} moduleType="policies" policies={policies} trashedPolicies={trashedPolicies} />;
}
