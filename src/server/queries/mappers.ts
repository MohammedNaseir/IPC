import 'server-only';
import type { FileRefDTO } from '@/lib/types';
import { fileUrl } from '@/server/files';

export const fileRefSelect = { id: true, name: true, mimeType: true, size: true } as const;

export function toFileRef(file: { id: string; name: string; mimeType: string; size: number }): FileRefDTO {
  return { url: fileUrl(file.id), name: file.name, mimeType: file.mimeType, size: file.size };
}

export function iso(date: Date): string;
export function iso(date: Date | null): string | null;
export function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
