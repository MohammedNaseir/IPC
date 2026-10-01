import { requirePageUser } from '@/server/auth/session';
import { listProgramTree, listTrashedProgramNodes } from '@/server/queries/library';
import { ProgramsView } from '@/components/views/ProgramsView';

export default async function ProgramsPage() {
  const user = await requirePageUser();
  const isCentral = user.role === 'central';
  const [{ nodes, files }, trashedNodes] = await Promise.all([
    listProgramTree(),
    // Trash is central-only (spec FR-005) -- no point fetching it for a hospital coordinator.
    isCentral ? listTrashedProgramNodes() : Promise.resolve([]),
  ]);
  return <ProgramsView user={user} nodes={nodes} files={files} trashedNodes={trashedNodes} />;
}
