import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// CLI (migrations) uses the direct, non-pooled Neon URL; the app runtime uses pooled DATABASE_URL (src/server/db.ts).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
