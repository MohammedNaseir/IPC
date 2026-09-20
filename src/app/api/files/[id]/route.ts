import { prisma } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';
import { INLINE_MIME_TYPES, readStoredFile } from '@/server/files';

const notFound = () => new Response('Not found', { status: 404 });

export async function GET(_request: Request, ctx: RouteContext<'/api/files/[id]'>) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await ctx.params;
  if (!id || id.length > 64) return notFound();

  const file = await prisma.storedFile.findUnique({
    where: { id },
    select: { name: true, mimeType: true, size: true, path: true, hospitalId: true },
  });
  if (!file) return notFound();

  // Hospital-owned files are only served to that hospital's coordinator and central users; 404 avoids confirming existence.
  if (file.hospitalId && user.role !== 'central' && user.hospitalId !== file.hospitalId) {
    return notFound();
  }

  let data: Buffer;
  try {
    data = await readStoredFile(file.path);
  } catch {
    return notFound();
  }

  const disposition = INLINE_MIME_TYPES.has(file.mimeType) ? 'inline' : 'attachment';
  const asciiName = file.name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const headers = new Headers({
    'Content-Type': file.mimeType,
    'Content-Length': String(file.size),
    'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (file.mimeType !== 'application/pdf') {
    headers.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
  }

  return new Response(new Uint8Array(data), { status: 200, headers });
}
