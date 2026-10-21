import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
if (!connectionString) throw new Error('DATABASE_URL must be set');
if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('ADMIN_EMAIL must be a valid email address');
const databaseUrl = connectionString;
const validatedAdminEmail = adminEmail;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;

const storage =
  r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2Bucket
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
        forcePathStyle: true,
      })
    : null;

type SeedStage = {
  position: number;
  title: string;
  subtitle: string;
  byTheEnd: string;
  weekLabel: string;
  prerequisiteStage: number | null;
  topics: { position: number; title: string; difficulty: string; estimatedMinutes: number }[];
  checkpoints: { position: number; task: string; timeEstimate: string }[];
};

function topicDocument(
  stage: SeedStage,
  topic: { title: string; difficulty: string; estimatedMinutes: number },
  checkpoint: { task: string; timeEstimate: string },
  quote: string,
): string {
  return [
    `# ${topic.title}`,
    '',
    `**${topic.difficulty}** · **${topic.estimatedMinutes} min** · Stage ${stage.position}: ${stage.title}`,
    '',
    stage.subtitle,
    '',
    '## Why this topic matters',
    '',
    stage.byTheEnd,
    '',
    '## What you will learn',
    '',
    `- What "${topic.title}" means and where it shows up in real products`,
    '- The three mistakes beginners make here, and how to avoid them',
    '- What "good" looks like, so you can critique your own work',
    '',
    '## Practice',
    '',
    '1. Open an app you use every day and find one example of this idea.',
    '2. Redo it badly on purpose, then fix it with the three techniques from this stage.',
    '3. Write down what changed and why the second version felt better.',
    '',
    `> ${quote}`,
    '',
    '## Checkpoint',
    '',
    `${checkpoint.task} (${checkpoint.timeEstimate})`,
    '',
  ].join('\n');
}

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: validatedAdminEmail } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`Admin role confirmed for ${validatedAdminEmail}`);
    return;
  }
  await prisma.user.create({ data: { email: validatedAdminEmail, name: 'Admin', role: 'ADMIN' } });
  console.log(`Admin account prepared for Google email ${validatedAdminEmail}`);
}

async function seedGuidebook() {
  const metadata = GUIDEBOOK_SEED.metadata as unknown as Prisma.InputJsonValue;

  const roadmap = await prisma.roadmap.upsert({
    where: { slug: GUIDEBOOK_SEED.slug },
    create: {
      title: GUIDEBOOK_SEED.title,
      slug: GUIDEBOOK_SEED.slug,
      description: GUIDEBOOK_SEED.description,
      position: 1,
      metadata,
    },
    update: {
      title: GUIDEBOOK_SEED.title,
      description: GUIDEBOOK_SEED.description,
      metadata,
    },
  });

  const quotes = GUIDEBOOK_SEED.metadata.quotes;
  let uploaded = 0;

  for (const stage of GUIDEBOOK_SEED.stages) {
    const stageRow = await prisma.stage.upsert({
      where: { roadmapId_position: { roadmapId: roadmap.id, position: stage.position } },
      create: {
        roadmapId: roadmap.id,
        position: stage.position,
        title: stage.title,
        subtitle: stage.subtitle,
        byTheEnd: stage.byTheEnd,
        weekLabel: stage.weekLabel,
        prerequisiteStage: stage.prerequisiteStage,
      },
      update: {
        title: stage.title,
        subtitle: stage.subtitle,
        byTheEnd: stage.byTheEnd,
        weekLabel: stage.weekLabel,
        prerequisiteStage: stage.prerequisiteStage,
      },
    });

    for (const topic of stage.topics) {
      const topicRow = await prisma.topic.upsert({
        where: { roadmapId_position: { roadmapId: roadmap.id, position: topic.position } },
        create: {
          roadmapId: roadmap.id,
          position: topic.position,
          title: topic.title,
          stage: stage.position,
          difficulty: topic.difficulty,
          estimatedMinutes: topic.estimatedMinutes,
        },
        update: {
          title: topic.title,
          stage: stage.position,
          difficulty: topic.difficulty,
          estimatedMinutes: topic.estimatedMinutes,
        },
      });

      if (!storage || topicRow.objectKey) {
        continue;
      }

      const checkpoint = stage.checkpoints[0] ?? {
        task: `Finish ${topic.title}`,
        timeEstimate: `${topic.estimatedMinutes} min`,
      };
      const document = topicDocument(
        stage,
        topic,
        checkpoint,
        quotes[topic.position % quotes.length] as string,
      );
      const objectKey = `roadmaps/${roadmap.id}/topics/${topicRow.id}/${randomUUID()}.md`;
      await storage.send(
        new PutObjectCommand({
          Bucket: r2Bucket as string,
          Key: objectKey,
          Body: Buffer.from(document, 'utf-8'),
          ContentType: 'text/markdown; charset=utf-8',
        }),
      );
      await prisma.topic.update({ where: { id: topicRow.id }, data: { objectKey } });
      uploaded += 1;
    }

    for (const checkpoint of stage.checkpoints) {
      const existing = await prisma.checkpoint.findFirst({
        where: { stageId: stageRow.id, position: checkpoint.position },
      });
      if (existing) {
        await prisma.checkpoint.update({
          where: { id: existing.id },
          data: { task: checkpoint.task, timeEstimate: checkpoint.timeEstimate },
        });
        continue;
      }
      await prisma.checkpoint.create({
        data: {
          stageId: stageRow.id,
          position: checkpoint.position,
          task: checkpoint.task,
          timeEstimate: checkpoint.timeEstimate,
        },
      });
    }
  }

  console.log(
    `Guidebook "${roadmap.title}" seeded with ${GUIDEBOOK_SEED.stages.length} stages, ` +
      `${GUIDEBOOK_SEED.stages.reduce((total, stage) => total + stage.topics.length, 0)} topics` +
      (uploaded > 0 ? ` and ${uploaded} uploaded documents.` : '.'),
  );
  if (!storage) {
    console.log(
      'R2 credentials are not configured — topic documents were not uploaded. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME, then run the seed again.',
    );
  }
}

async function main() {
  await seedAdmin();
  await seedGuidebook();
}

main().finally(() => prisma.$disconnect());
const GUIDEBOOK_SEED = {
  slug: 'ui-ux-designer',
  title: 'UI/UX Designer',
  description: 'From "what even is hierarchy?" to a case study that gets replies. One step at a time, tick things off as you go.',
  metadata: {
    number: '01',
    label: '(Roadmap 01)',
    subtitle: 'From "what even is hierarchy?" to a case study that gets replies. One step at a time, tick things off as you go.',
    metaPills: [
      '6 stages',
      '38 topics',
      '~14 hours',
      'Beginner → job-ready',
    ],
    disciplines: [
      {
        label: 'UI/UX',
        active: true,
      },
      {
        label: 'Graphic design',
        active: false,
      },
      {
        label: 'Product design',
        active: false,
      },
      {
        label: 'Design engineering',
        active: false,
      },
    ],
    beforeYouStart: [
      {
        colorLabel: 'WHO THIS IS FOR',
        title: 'Total beginners, students and career switchers',
        bullets: [
          'No design background needed',
          'Zero Figma knowledge needed',
          'Curious about how apps feel good to use',
        ],
      },
      {
        colorLabel: 'WHAT YOU NEED',
        title: 'Not much, honestly',
        bullets: [
          'A laptop and decent internet',
          'A free Figma account',
          '30 minutes a day',
        ],
      },
      {
        colorLabel: 'HOW IT WORKS',
        title: 'Read, do, tick',
        bullets: [
          'Read the theory page (6 min)',
          'Do the checkpoint at the end of each stage',
          'Tick it off and watch the bar move',
        ],
      },
    ],
    timelinePace: '6 weeks at 30 minutes a day',
    quotes: [
      'Everyone\'s first Figma file looks like a fever dream. That\'s normal. Keep going.',
      'Hierarchy is just kindness for the eye.',
      'Talking to users is terrifying until it isn\'t. After the third interview, you\'ll wonder why you ever designed without it.',
      'Your first wireframe will be terrible. Do it anyway. The second one will be better.',
      'Auto layout will betray you exactly once. After that, it\'ll be your best friend.',
    ],
  },
  stages: [
    {
      position: 1,
      title: 'Foundations',
      subtitle: 'What design is, and how designers actually think',
      byTheEnd: 'explain what designers do and set up your tools.',
      weekLabel: 'Week 1',
      prerequisiteStage: null,
      topics: [
        {
          position: 1,
          title: 'What design actually is',
          difficulty: 'beginner',
          estimatedMinutes: 10,
        },
        {
          position: 2,
          title: 'UX vs UI vs Product',
          difficulty: 'beginner',
          estimatedMinutes: 10,
        },
        {
          position: 3,
          title: 'The design process, start to finish',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 4,
          title: 'Setting up Figma',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 5,
          title: 'Seeing like a designer',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 6,
          title: 'Giving and taking critique',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
      ],
      checkpoints: [
        {
          position: 1,
          task: 'Teardown one app you use daily',
          timeEstimate: '~1 hr',
        },
      ],
    },
    {
      position: 2,
      title: 'Layout & Hierarchy',
      subtitle: 'Make things look like they belong together',
      byTheEnd: 'make any screen look organised and easy to read.',
      weekLabel: 'Week 2',
      prerequisiteStage: 1,
      topics: [
        {
          position: 7,
          title: 'Grids & spacing',
          difficulty: 'beginner',
          estimatedMinutes: 20,
        },
        {
          position: 8,
          title: 'Typography basics',
          difficulty: 'beginner',
          estimatedMinutes: 20,
        },
        {
          position: 9,
          title: 'Alignment & proximity',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 10,
          title: 'Visual hierarchy',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 11,
          title: 'Color & contrast',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 12,
          title: 'Responsive layout',
          difficulty: 'intermediate',
          estimatedMinutes: 30,
        },
      ],
      checkpoints: [
        {
          position: 1,
          task: 'Fix a messy screen with 3 techniques',
          timeEstimate: '~2 hrs',
        },
      ],
    },
    {
      position: 3,
      title: 'User research',
      subtitle: 'Find out what people need before you build',
      byTheEnd: 'run a small research round and synthesise the findings.',
      weekLabel: 'Week 3',
      prerequisiteStage: 2,
      topics: [
        {
          position: 13,
          title: 'Who are you designing for?',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 14,
          title: 'User interviews',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 15,
          title: 'Surveys that don\'t lie',
          difficulty: 'intermediate',
          estimatedMinutes: 20,
        },
        {
          position: 16,
          title: 'Personas (without the cringe)',
          difficulty: 'intermediate',
          estimatedMinutes: 20,
        },
        {
          position: 17,
          title: 'Empathy maps',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 18,
          title: 'Competitor analysis',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 19,
          title: 'Problem statements & HMW',
          difficulty: 'intermediate',
          estimatedMinutes: 20,
        },
      ],
      checkpoints: [
        {
          position: 1,
          task: 'Interview 3 real humans',
          timeEstimate: '~3 hrs',
        },
      ],
    },
    {
      position: 4,
      title: 'Wireframes & flows',
      subtitle: 'Turn an idea into something you can click',
      byTheEnd: 'map a flow and test a wireframe with a real person.',
      weekLabel: 'Week 4',
      prerequisiteStage: 3,
      topics: [
        {
          position: 20,
          title: 'User flows',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 21,
          title: 'Information architecture',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 22,
          title: 'Sketching ideas fast',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 23,
          title: 'Low-fi wireframes',
          difficulty: 'intermediate',
          estimatedMinutes: 30,
        },
        {
          position: 24,
          title: 'Mobile vs desktop patterns',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 25,
          title: 'Testing early',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
      ],
      checkpoints: [
        {
          position: 1,
          task: 'Wireframe a 5-screen flow',
          timeEstimate: '~3 hrs',
        },
      ],
    },
    {
      position: 5,
      title: 'Figma, properly',
      subtitle: 'Clean, reusable, developer-friendly files',
      byTheEnd: 'build files your future self will thank you for.',
      weekLabel: 'Week 5',
      prerequisiteStage: 4,
      topics: [
        {
          position: 26,
          title: 'Frames & auto layout',
          difficulty: 'intermediate',
          estimatedMinutes: 30,
        },
        {
          position: 27,
          title: 'Components & variants',
          difficulty: 'intermediate',
          estimatedMinutes: 30,
        },
        {
          position: 28,
          title: 'Styles & variables',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 29,
          title: 'Constraints & responsive',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 30,
          title: 'Prototyping basics',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 31,
          title: 'Design systems 101',
          difficulty: 'advanced',
          estimatedMinutes: 35,
        },
        {
          position: 32,
          title: 'Accessibility basics',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 33,
          title: 'Handoff to developers',
          difficulty: 'advanced',
          estimatedMinutes: 25,
        },
      ],
      checkpoints: [
        {
          position: 1,
          task: 'Build a mini component library',
          timeEstimate: '~4 hrs',
        },
      ],
    },
    {
      position: 6,
      title: 'Build your portfolio',
      subtitle: 'Package your work so people actually read it',
      byTheEnd: 'publish a case study you\'re proud to share.',
      weekLabel: 'Week 6',
      prerequisiteStage: 5,
      topics: [
        {
          position: 34,
          title: 'Pick a project worth showing',
          difficulty: 'beginner',
          estimatedMinutes: 15,
        },
        {
          position: 35,
          title: 'Structure a case study',
          difficulty: 'intermediate',
          estimatedMinutes: 25,
        },
        {
          position: 36,
          title: 'Write the story',
          difficulty: 'intermediate',
          estimatedMinutes: 30,
        },
        {
          position: 37,
          title: 'Polish your visuals',
          difficulty: 'intermediate',
          estimatedMinutes: 30,
        },
        {
          position: 38,
          title: 'Publish & share it',
          difficulty: 'beginner',
          estimatedMinutes: 20,
        },
      ],
      checkpoints: [
        {
          position: 1,
          task: 'Publish your first case study',
          timeEstimate: '~6 hrs',
        },
      ],
    },
  ],
};
