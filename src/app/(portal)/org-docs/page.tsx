import { requirePageUser } from '@/server/auth/session';
import { listOrgDocuments, listTrashedOrgDocuments } from '@/server/queries/library';
import { DocumentsView } from '@/components/views/DocumentsView';

export default async function OrgDocsPage() {
  const user = await requirePageUser();
  const isCentral = user.role === 'central';
  const [orgDocs, trashedOrgDocs] = await Promise.all([
    listOrgDocuments(),
    isCentral ? listTrashedOrgDocuments() : Promise.resolve([]),
  ]);
  return <DocumentsView user={user} moduleType="orgDocs" orgDocs={orgDocs} trashedOrgDocs={trashedOrgDocs} />;
}
