import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const owner = await prisma.user.create({
    data: {
      email: 'seed@designersroom.dev',
      password: await bcrypt.hash('password123', 10),
      name: 'Seed Owner',
    },
  });

  const roadmap = await prisma.roadmap.create({
    data: {
      title: 'Product Design Roadmap',
      description: 'Our MVP roadmap covering the core skills every product designer needs.',
      userId: owner.id,
    },
  });

  const topics = [
    {
      title: 'Design Fundamentals',
      description: 'Beginner - color, typography, layout, and visual hierarchy.',
      position: 0,
    },
    {
      title: 'User Research',
      description: 'Beginner - interviews, surveys, and synthesizing insights.',
      position: 1,
    },
    {
      title: 'Interaction Design',
      description: 'Intermediate - user flows, states, and prototyping.',
      position: 2,
    },
    {
      title: 'Design Systems',
      description: 'Advanced - tokens, reusable components, and documentation.',
      position: 3,
    },
    {
      title: 'Portfolio & Case Studies',
      description: 'Advanced - presenting process, decisions, and outcomes.',
      position: 4,
    },
  ];

  await prisma.topic.createMany({
    data: topics.map((topic) => ({ ...topic, roadmapId: roadmap.id })),
  });

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
