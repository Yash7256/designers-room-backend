import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed must not run in production. Exiting.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

const seedPassword = process.env.SEED_USER_PASSWORD ?? 'password123';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'seed@designersroom.dev' },
    update: {},
    create: {
      email: 'seed@designersroom.dev',
      password: await bcrypt.hash(seedPassword, 10),
      name: 'Seed Owner',
    },
  });

  const roadmap = await prisma.roadmap.upsert({
    where: { id: 'seed-roadmap-id-00000000001' },
    update: {},
    create: {
      id: 'seed-roadmap-id-00000000001',
      title: 'Product Design Roadmap',
      description:
        'Our MVP roadmap covering the core skills every product designer needs.',
      userId: owner.id,
    },
  });

  const topics = [
    {
      id: 'seed-topic-id-000000000001',
      title: 'Design Fundamentals',
      description: 'Beginner - color, typography, layout, and visual hierarchy.',
      position: 0,
    },
    {
      id: 'seed-topic-id-000000000002',
      title: 'User Research',
      description: 'Beginner - interviews, surveys, and synthesizing insights.',
      position: 1,
    },
    {
      id: 'seed-topic-id-000000000003',
      title: 'Interaction Design',
      description: 'Intermediate - user flows, states, and prototyping.',
      position: 2,
    },
    {
      id: 'seed-topic-id-000000000004',
      title: 'Design Systems',
      description: 'Advanced - tokens, reusable components, and documentation.',
      position: 3,
    },
    {
      id: 'seed-topic-id-000000000005',
      title: 'Portfolio & Case Studies',
      description: 'Advanced - presenting process, decisions, and outcomes.',
      position: 4,
    },
  ];

  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { id: topic.id },
      update: {},
      create: { ...topic, roadmapId: roadmap.id },
    });
  }

  console.log(
    `Seeded roadmap "${roadmap.title}" (${roadmap.id}) with ${topics.length} topics.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
