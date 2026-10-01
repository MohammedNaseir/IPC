import 'server-only';
import { prisma, prismaUnfiltered } from '@/server/db';
import type {
  DocumentCenterFileDTO,
  OrgDocumentDTO,
  PolicyDTO,
  ProgramFileDTO,
  ProgramNodeDTO,
  TrashedProgramNodeDTO,
  TrashedRecordMeta,
} from '@/lib/types';
import { fileRefSelect, iso, toFileRef } from '@/server/queries/mappers';
import { attachTrashMeta } from '@/server/queries/trash';

// Library content (FR-28, FR-34) is visible to every signed-in user; callers must still require a session.

const fileWithUploader = {
  select: { ...fileRefSelect, uploadedBy: { select: { name: true } } },
} as const;

export async function listPolicies(): Promise<PolicyDTO[]> {
  const rows = await prisma.policy.findMany({
    orderBy: { uploadedAt: 'desc' },
    include: { file: { select: fileRefSelect } },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    version: p.version,
    file: toFileRef(p.file),
    uploadedAt: iso(p.uploadedAt),
  }));
}

export async function listOrgDocuments(): Promise<OrgDocumentDTO[]> {
  const rows = await prisma.orgDocument.findMany({
    orderBy: { uploadedAt: 'desc' },
    include: { file: fileWithUploader },
  });
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    file: toFileRef(d.file),
    uploadedBy: d.file.uploadedBy?.name ?? null,
    uploadedAt: iso(d.uploadedAt),
  }));
}

export async function listDocumentCenterFiles(): Promise<DocumentCenterFileDTO[]> {
  const rows = await prisma.documentCenterFile.findMany({
    orderBy: { uploadedAt: 'desc' },
    include: { file: fileWithUploader },
  });
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    file: toFileRef(d.file),
    uploadedBy: d.file.uploadedBy?.name ?? null,
    uploadedAt: iso(d.uploadedAt),
  }));
}

// Trash listings (005-soft-delete, US2). Central-only by convention.
export async function listTrashedPolicies(): Promise<(PolicyDTO & TrashedRecordMeta)[]> {
  const rows = await prismaUnfiltered.policy.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { file: { select: fileRefSelect } },
  });
  return attachTrashMeta(
    'Policy',
    rows.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      file: toFileRef(p.file),
      uploadedAt: iso(p.uploadedAt),
      deletedAt: p.deletedAt,
    })),
  );
}

export async function listTrashedOrgDocuments(): Promise<(OrgDocumentDTO & TrashedRecordMeta)[]> {
  const rows = await prismaUnfiltered.orgDocument.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { file: fileWithUploader },
  });
  return attachTrashMeta(
    'Document',
    rows.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      file: toFileRef(d.file),
      uploadedBy: d.file.uploadedBy?.name ?? null,
      uploadedAt: iso(d.uploadedAt),
      deletedAt: d.deletedAt,
    })),
  );
}

export async function listTrashedDocumentCenterFiles(): Promise<(DocumentCenterFileDTO & TrashedRecordMeta)[]> {
  const rows = await prismaUnfiltered.documentCenterFile.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { file: fileWithUploader },
  });
  return attachTrashMeta(
    'Document',
    rows.map((d) => ({
      id: d.id,
      title: d.title,
      file: toFileRef(d.file),
      uploadedBy: d.file.uploadedBy?.name ?? null,
      uploadedAt: iso(d.uploadedAt),
      deletedAt: d.deletedAt,
    })),
  );
}

export async function listProgramTree(): Promise<{ nodes: ProgramNodeDTO[]; files: ProgramFileDTO[] }> {
  const [programs, folders, files] = await Promise.all([
    prisma.program.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.programFolder.findMany({ orderBy: { name: 'asc' } }),
    prisma.programFile.findMany({ orderBy: { createdAt: 'desc' }, include: { file: { select: fileRefSelect } } }),
  ]);

  const nodes: ProgramNodeDTO[] = [
    ...programs.map((p) => ({
      id: p.id,
      kind: 'program' as const,
      parentId: null,
      name: p.name,
      description: p.description,
    })),
    ...folders.map((f) => ({
      id: f.id,
      kind: 'folder' as const,
      parentId: f.parentFolderId ?? f.programId,
      name: f.name,
      description: f.description,
    })),
  ];

  return {
    nodes,
    files: files.map((f) => ({
      id: f.id,
      parentId: f.folderId ?? f.programId,
      name: f.name,
      file: toFileRef(f.file),
      uploadedAt: iso(f.createdAt),
    })),
  };
}

// Trash listing (005-soft-delete, US5). Central-only by convention. Shows one row per deletion
// *event root* -- the node the user actually deleted -- not one row per cascaded descendant: a
// folder/file is a root only when its parent is NOT part of the same deletion event (R-010: read
// top-level, not through nested relations, to stay correctly filtered).
export async function listTrashedProgramNodes(): Promise<TrashedProgramNodeDTO[]> {
  const [programs, folders, files] = await Promise.all([
    prismaUnfiltered.program.findMany({ where: { deletedAt: { not: null } } }),
    prismaUnfiltered.programFolder.findMany({ where: { deletedAt: { not: null } } }),
    prismaUnfiltered.programFile.findMany({ where: { deletedAt: { not: null } } }),
  ]);

  const programEventById = new Map(programs.map((p) => [p.id, p.deletionEventId]));
  const folderEventById = new Map(folders.map((f) => [f.id, f.deletionEventId]));

  type Root = { id: string; kind: 'program' | 'folder' | 'file'; name: string; deletedAt: Date; eventId: string | null };
  const roots: Root[] = programs.map((p) => ({ id: p.id, kind: 'program', name: p.name, deletedAt: p.deletedAt!, eventId: p.deletionEventId }));

  for (const f of folders) {
    const parentEventId = f.parentFolderId ? folderEventById.get(f.parentFolderId) : programEventById.get(f.programId);
    if (parentEventId !== f.deletionEventId) roots.push({ id: f.id, kind: 'folder', name: f.name, deletedAt: f.deletedAt!, eventId: f.deletionEventId });
  }
  for (const f of files) {
    const parentEventId = f.folderId ? folderEventById.get(f.folderId) : programEventById.get(f.programId);
    if (parentEventId !== f.deletionEventId) roots.push({ id: f.id, kind: 'file', name: f.name, deletedAt: f.deletedAt!, eventId: f.deletionEventId });
  }

  const withCounts = roots.map((r) => ({
    ...r,
    folderCount: r.kind === 'file' || !r.eventId ? 0 : folders.filter((f) => f.deletionEventId === r.eventId).length - (r.kind === 'folder' ? 1 : 0),
    fileCount: r.kind === 'file' || !r.eventId ? 0 : files.filter((f) => f.deletionEventId === r.eventId).length,
  }));

  const [programRows, folderRows, fileRows] = await Promise.all([
    attachTrashMeta('Program', withCounts.filter((r) => r.kind === 'program')),
    attachTrashMeta('ProgramFolder', withCounts.filter((r) => r.kind === 'folder')),
    attachTrashMeta('Document', withCounts.filter((r) => r.kind === 'file')),
  ]);

  return [...programRows, ...folderRows, ...fileRows].sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
}
