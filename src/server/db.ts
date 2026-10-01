import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { softDeleteExtension } from '@/server/db/softDelete';

export type { Prisma } from '@/generated/prisma/client';

function buildBaseClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Letting TypeScript infer this function's return type (rather than annotating it) is deliberate:
// `$extends`'s own declared type is a complex generic (`ExtendsHook<...>`) that `ReturnType<>`
// cannot resolve correctly when read off `PrismaClient` abstractly, but inference through an
// actual call expression like this one resolves correctly.
function buildExtendedClient(base: PrismaClient) {
  return base.$extends(softDeleteExtension);
}

type ExtendedPrismaClient = ReturnType<typeof buildExtendedClient>;

// The type of `tx` inside `prisma.$transaction(async (tx) => ...)`, now that `prisma` is the
// soft-delete-extended client rather than the base one -- every action's `logAudit(tx, ...)` call
// needs this type instead of the base `Prisma.TransactionClient` (specs/005-soft-delete).
export type ExtendedTransactionClient = Parameters<ExtendedPrismaClient['$transaction']> extends [
  (tx: infer T) => unknown,
  ...unknown[],
]
  ? T
  : never;

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
  prismaExtended?: ExtendedPrismaClient;
};

function getBaseClient(): PrismaClient {
  if (!globalForPrisma.prismaBase) {
    globalForPrisma.prismaBase = buildBaseClient();
  }
  return globalForPrisma.prismaBase;
}

// The soft-delete-filtered client (specs/005-soft-delete). Every app read on an in-scope model
// excludes deleted rows automatically; .delete()/.deleteMany() on one refuses. This is what every
// normal import of `prisma` gets.
function getExtendedClient(): ExtendedPrismaClient {
  if (!globalForPrisma.prismaExtended) {
    globalForPrisma.prismaExtended = buildExtendedClient(getBaseClient());
  }
  return globalForPrisma.prismaExtended;
}

// Created lazily so importing this module (e.g. during `next build`) never requires a live database.
export const prisma = new Proxy({} as ExtendedPrismaClient, {
  get(_target, prop) {
    const client = getExtendedClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * The unfiltered client (specs/005-soft-delete/research.md R-001). Sees soft-deleted rows and is
 * not subject to the delete refusal. Exclusively for src/server/queries/trash.ts and the
 * delete/restore actions' own cascade lookups -- never imported by an ordinary query or view.
 * Shares the same underlying connection pool as `prisma`; this is a second typed view onto the
 * same base client, not a second connection.
 */
export const prismaUnfiltered = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getBaseClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
