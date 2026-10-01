import { requirePageUser } from '@/server/auth/session';
import { listDocumentCenterFiles, listTrashedDocumentCenterFiles } from '@/server/queries/library';
import { DocumentsView } from '@/components/views/DocumentsView';

export default async function DocCenterPage() {
  const user = await requirePageUser();
  const isCentral = user.role === 'central';
  const [docCenterItems, trashedDocCenterItems] = await Promise.all([
    listDocumentCenterFiles(),
    isCentral ? listTrashedDocumentCenterFiles() : Promise.resolve([]),
  ]);
  return (
    <DocumentsView
      user={user}
      moduleType="docCenter"
      docCenterItems={docCenterItems}
      trashedDocCenterItems={trashedDocCenterItems}
    />
  );
}
