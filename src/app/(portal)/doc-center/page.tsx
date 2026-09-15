import { requirePageUser } from '@/server/auth/session';
import { listDocumentCenterFiles } from '@/server/queries/library';
import { DocumentsView } from '@/components/views/DocumentsView';

export default async function DocCenterPage() {
  const user = await requirePageUser();
  const docCenterItems = await listDocumentCenterFiles();
  return <DocumentsView user={user} moduleType="docCenter" docCenterItems={docCenterItems} />;
}
