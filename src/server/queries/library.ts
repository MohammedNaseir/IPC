import 'server-only';
import { prisma } from '@/server/db';
import type {
  DocumentCenterFileDTO,
  OrgDocumentDTO,
  PolicyDTO,
  ProgramFileDTO,
  ProgramNodeDTO,
} from '@/lib/types';
import { fileRefSelect, iso, toFileRef } from '@/server/queries/mappers';

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
