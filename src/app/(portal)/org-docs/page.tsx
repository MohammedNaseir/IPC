import { requirePageUser } from '@/server/auth/session';
import { listOrgDocuments } from '@/server/queries/library';
import { DocumentsView } from '@/components/views/DocumentsView';

export default async function OrgDocsPage() {
  const user = await requirePageUser();
  const orgDocs = await listOrgDocuments();
  return <DocumentsView user={user} moduleType="orgDocs" orgDocs={orgDocs} />;
}
