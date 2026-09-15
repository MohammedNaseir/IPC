import 'server-only';
import { prisma } from '@/server/db';
import type { EquipmentDTO, PractitionerDTO, SessionUser } from '@/lib/types';
import { hospitalScope } from '@/server/auth/scope';
import { iso } from '@/server/queries/mappers';

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
