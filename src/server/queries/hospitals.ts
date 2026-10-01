import 'server-only';
import { prisma, prismaUnfiltered } from '@/server/db';
import type { HospitalDTO, SessionUser, TrashedCoordinatorDTO, TrashedHospitalDTO } from '@/lib/types';
import { iso } from '@/server/queries/mappers';
import { attachTrashMeta } from '@/server/queries/trash';

const hospitalSelect = {
  id: true,
  name: true,
  location: true,
  type: true,
  isActive: true,
  createdAt: true,
} as const;

type HospitalRow = {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
};

function toHospitalDTO(h: HospitalRow, coordinator: { id: string; name: string; email: string } | null): HospitalDTO {
  return {
    id: h.id,
    name: h.name,
    location: h.location,
    type: h.type,
    isActive: h.isActive,
    createdAt: iso(h.createdAt),
    coordinator,
  };
}

export async function listHospitals(user: SessionUser): Promise<HospitalDTO[]> {
  // Soft delete (005-soft-delete, US6/R-005): a nested `select`/`include` on a to-one relation (like
  // `coordinator` here) is not covered by the extension's read-filtering -- only a top-level
  // `model.operation()` call is (confirmed in testing: a soft-deleted coordinator kept showing up as
  // a hospital's active one through the nested form). Fetched as two separate, independently
  // filtered top-level queries and merged here instead.
  const [rows, coordinators] = await Promise.all([
    prisma.hospital.findMany({
      where: user.role === 'central' ? {} : { id: user.hospitalId! },
      select: hospitalSelect,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({ where: { role: 'hospital' }, select: { id: true, name: true, email: true, hospitalId: true } }),
  ]);
  const coordinatorByHospital = new Map(coordinators.map((c) => [c.hospitalId, c]));
  return rows.map((h) => toHospitalDTO(h, coordinatorByHospital.get(h.id) ?? null));
}

// Trash listing (005-soft-delete, US4). Central-only by convention.
export async function listTrashedHospitals(): Promise<TrashedHospitalDTO[]> {
  const rows = await prismaUnfiltered.hospital.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
  });
  return attachTrashMeta(
    'Hospital',
    rows.map((h) => ({ id: h.id, name: h.name, location: h.location, type: h.type, deletedAt: h.deletedAt })),
  );
}

// Trash listing (005-soft-delete, US6). Central-only by convention.
export async function listTrashedCoordinators(): Promise<TrashedCoordinatorDTO[]> {
  const rows = await prismaUnfiltered.user.findMany({
    where: { role: 'hospital', deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return attachTrashMeta(
    'User',
    rows.map((u) => ({ id: u.id, name: u.name, email: u.email, hospitalName: u.hospital?.name ?? null, deletedAt: u.deletedAt })),
  );
}
