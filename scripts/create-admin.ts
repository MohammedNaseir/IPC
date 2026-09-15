// Creates a central-administration account. The app ships with no users, so run this once per environment:
//   npm run admin:create -- --email <admin-email> --name "اسم المشرف"
// The password is read from ADMIN_PASSWORD if set, otherwise prompted for without echo.
import 'dotenv/config';
import { parseArgs } from 'node:util';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const PASSWORD_MIN_LENGTH = 12;

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    output._writeToOutput = (s: string) => {
      if (s.includes(question)) output.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' } },
  });
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<full name>"');
    process.exit(1);
  }

  const password = process.env.ADMIN_PASSWORD ?? (await promptHidden('Password: '));
  if (password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password, 'utf8') > 72) {
    console.error(`Password must be ${PASSWORD_MIN_LENGTH}-72 bytes long.`);
    process.exit(1);
  }

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL (or DIRECT_URL) is not set.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      console.error('A user with this email already exists.');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, role: 'central', passwordHash },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        entityType: 'User',
        entityId: user.id,
        action: 'إنشاء حساب إدارة مركزية عبر أداة الإعداد',
        performedByName: 'system:create-admin',
      },
    });
    console.log(`Central admin created: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
