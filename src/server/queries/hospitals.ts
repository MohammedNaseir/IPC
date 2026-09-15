import 'server-only';
import { prisma } from '@/server/db';
import type { HospitalDTO, SessionUser } from '@/lib/types';
import { iso } from '@/server/queries/mappers';

const hospitalSelect = {
  id: true,
  name: true,
  location: true,
  type: true,
  isActive: true,
  createdAt: true,
  coordinator: { select: { id: true, name: true, email: true } },
} as const;

type HospitalRow = {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
  coordinator: { id: string; name: string; email: string } | null;
};

function toHospitalDTO(h: HospitalRow): HospitalDTO {
  return {
    id: h.id,
    name: h.name,
    location: h.location,
    type: h.type,
    isActive: h.isActive,
    createdAt: iso(h.createdAt),
    coordinator: h.coordinator,
  };
}

export async function listHospitals(user: SessionUser): Promise<HospitalDTO[]> {
  const rows = await prisma.hospital.findMany({
    where: user.role === 'central' ? {} : { id: user.hospitalId! },
    select: hospitalSelect,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toHospitalDTO);
}
