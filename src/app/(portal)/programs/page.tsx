import { requirePageUser } from '@/server/auth/session';
import { listProgramTree } from '@/server/queries/library';
import { ProgramsView } from '@/components/views/ProgramsView';

export default async function ProgramsPage() {
  const user = await requirePageUser();
  const { nodes, files } = await listProgramTree();
  return <ProgramsView user={user} nodes={nodes} files={files} />;
}
