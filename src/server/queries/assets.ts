import 'server-only';
import { prisma, prismaUnfiltered } from '@/server/db';
import type { EquipmentDTO, PractitionerDTO, SessionUser, TrashedRecordMeta } from '@/lib/types';
import { hospitalScope } from '@/server/auth/scope';
import { iso } from '@/server/queries/mappers';
import { attachTrashMeta } from '@/server/queries/trash';

export async function listPractitioners(user: SessionUser): Promise<PractitionerDTO[]> {
  const rows = await prisma.practitioner.findMany({
    where: hospitalScope(user),
    orderBy: { createdAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    hospitalId: p.hospitalId,
    hospitalName: p.hospital.name,
    name: p.name,
    role: p.role,
    licenseNumber: p.licenseNumber,
    email: p.email,
    phone: p.phone,
  }));
}

export async function listEquipments(user: SessionUser): Promise<EquipmentDTO[]> {
  const rows = await prisma.equipment.findMany({
    where: hospitalScope(user),
    orderBy: { createdAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return rows.map((e) => ({
    id: e.id,
    hospitalId: e.hospitalId,
    hospitalName: e.hospital.name,
    name: e.name,
    type: e.type,
    serialNumber: e.serialNumber,
    status: e.status,
    lastMaintenance: iso(e.lastMaintenance),
  }));
}

// Trash listings (005-soft-delete, US1). Central-only by convention -- the page/action calling
// these is what actually enforces that (contracts/soft-delete.md FR-005); these queries themselves
// are unscoped by hospital since only central ever sees a trash view.
export async function listTrashedPractitioners(): Promise<(PractitionerDTO & TrashedRecordMeta)[]> {
  const rows = await prismaUnfiltered.practitioner.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return attachTrashMeta(
    'Practitioner',
    rows.map((p) => ({
      id: p.id,
      hospitalId: p.hospitalId,
      hospitalName: p.hospital.name,
      name: p.name,
      role: p.role,
      licenseNumber: p.licenseNumber,
      email: p.email,
      phone: p.phone,
      deletedAt: p.deletedAt,
    })),
  );
}

export async function listTrashedEquipments(): Promise<(EquipmentDTO & TrashedRecordMeta)[]> {
  const rows = await prismaUnfiltered.equipment.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return attachTrashMeta(
    'Equipment',
    rows.map((e) => ({
      id: e.id,
      hospitalId: e.hospitalId,
      hospitalName: e.hospital.name,
      name: e.name,
      type: e.type,
      serialNumber: e.serialNumber,
      status: e.status,
      lastMaintenance: iso(e.lastMaintenance),
      deletedAt: e.deletedAt,
    })),
  );
}
