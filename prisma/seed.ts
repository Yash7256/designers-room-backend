import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
if (!connectionString) throw new Error('DATABASE_URL must be set');
if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('ADMIN_EMAIL must be a valid email address');
const databaseUrl = connectionString;
const validatedAdminEmail = adminEmail;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: validatedAdminEmail } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`Admin role confirmed for ${validatedAdminEmail}`);
    return;
  }
  await prisma.user.create({ data: { email: validatedAdminEmail, name: 'Admin', role: 'ADMIN' } });
  console.log(`Admin account prepared for Google email ${validatedAdminEmail}`);
}

main().finally(() => prisma.$disconnect());
