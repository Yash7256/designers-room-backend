import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
if (!connectionString) throw new Error('DATABASE_URL must be set');
if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('ADMIN_EMAIL must be a valid email address');
const databaseUrl = connectionString;
const validatedAdminEmail = adminEmail;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

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

type GuidebookMetadata = {
  quotes: string[];
  [key: string]: unknown;
};

type GuidebookSeed = {
  slug: string;
  title: string;
  description: string;
  position: number;
  metadata: GuidebookMetadata;
  stages: SeedStage[];
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

async function seedGuidebook(seed: GuidebookSeed) {
  const metadata = seed.metadata as unknown as Prisma.InputJsonValue;

  const roadmap = await prisma.roadmap.upsert({
    where: { slug: seed.slug },
    create: {
      title: seed.title,
      slug: seed.slug,
      description: seed.description,
      position: seed.position,
      metadata,
    },
    update: {
      title: seed.title,
      description: seed.description,
      position: seed.position,
      metadata,
    },
  });

  const quotes = seed.metadata.quotes;
  let stored = 0;

  for (const stage of seed.stages) {
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

      const existingDocument = await prisma.topicDocument.findUnique({
        where: { topicId: topicRow.id },
        select: { topicId: true },
      });
      if (existingDocument || topicRow.objectKey) {
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
      await prisma.topicDocument.create({
        data: {
          topicId: topicRow.id,
          body: document,
          contentType: 'text/markdown; charset=utf-8',
          sizeBytes: Buffer.byteLength(document, 'utf-8'),
          contentHash: createHash('sha256').update(document).digest('hex'),
        },
      });
      stored += 1;
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
    `Guidebook "${roadmap.title}" seeded with ${seed.stages.length} stages, ` +
      `${seed.stages.reduce((total, stage) => total + stage.topics.length, 0)} topics` +
      (stored > 0 ? ` and ${stored} documents.` : '.'),
  );
}

async function main() {
  await seedAdmin();
  for (const seed of GUIDEBOOK_SEEDS) {
    await seedGuidebook(seed);
  }
}

main().finally(() => prisma.$disconnect());
const GUIDEBOOK_SEEDS: GuidebookSeed[] = [
  {
    slug: 'ui-ux-designer',
    title: 'UI/UX Designer',
    description:
      'From "what even is hierarchy?" to a case study that gets replies. One step at a time, tick things off as you go.',
    position: 1,
    metadata: {
      label: '(Roadmap 01)',
      number: '01',
      quotes: [
        "Everyone's first Figma file looks like a crime scene. Keep going.",
        'Hierarchy is just kindness for tired eyes.',
        'Talking to users is terrifying for ten minutes and useful for ten months.',
        "Your first wireframe will be ugly. That's the whole point.",
        "Auto layout will betray you once. Then you'll never leave it.",
      ],
      stages: [
        {
          title: 'Foundations',
          number: '01',
          topics: [
            {
              level: 'Beginner',
              needs: [],
              title: 'What design actually is',
              timeMinutes: 10,
            },
            {
              level: 'Beginner',
              needs: ['What design actually is'],
              title: 'UX vs UI vs Product',
              timeMinutes: 10,
            },
            {
              level: 'Beginner',
              needs: ['UX vs UI vs Product'],
              title: 'The design process, start to finish',
              timeMinutes: 15,
            },
            {
              level: 'Beginner',
              needs: [],
              title: 'Setting up Figma',
              timeMinutes: 15,
            },
            {
              level: 'Beginner',
              needs: [],
              title: 'Seeing like a designer',
              timeMinutes: 15,
            },
            {
              level: 'Beginner',
              needs: [],
              title: 'Giving and taking critique',
              timeMinutes: 15,
            },
          ],
          outcome: 'You can explain what designers do and set up your tools.',
          subtitle: 'What design is, and how designers actually think.',
          checkpoint: {
            time: 'about 1 hour',
            title: 'Teardown one app you use daily',
          },
          quoteAfter: "Everyone's first Figma file looks like a crime scene. Keep going.",
          prerequisites: [],
        },
        {
          title: 'Layout & Hierarchy',
          number: '02',
          topics: [
            {
              level: 'Beginner',
              needs: [],
              title: 'Grids & spacing',
              timeMinutes: 20,
            },
            {
              level: 'Beginner',
              needs: [],
              title: 'Typography basics',
              timeMinutes: 20,
            },
            {
              level: 'Beginner',
              needs: ['Grids & spacing'],
              title: 'Alignment & proximity',
              timeMinutes: 15,
            },
            {
              level: 'Intermediate',
              needs: ['Typography basics', 'Alignment & proximity'],
              title: 'Visual hierarchy',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Visual hierarchy'],
              title: 'Color & contrast',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Grids & spacing'],
              title: 'Responsive layout',
              timeMinutes: 30,
            },
          ],
          outcome: 'You can make any screen look organized and intentional.',
          subtitle: 'Make things look like they belong together.',
          checkpoint: {
            time: 'about 2 hours',
            title: 'Fix a messy screen with 3 text styles',
          },
          quoteAfter: 'Hierarchy is just kindness for tired eyes.',
          prerequisites: ['01'],
        },
        {
          title: 'User research',
          number: '03',
          topics: [
            {
              level: 'Beginner',
              needs: [],
              title: 'Who are you designing for?',
              timeMinutes: 15,
            },
            {
              level: 'Intermediate',
              needs: ['Who are you designing for?'],
              title: 'User interviews',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Who are you designing for?'],
              title: "Surveys that don't lie",
              timeMinutes: 20,
            },
            {
              level: 'Intermediate',
              needs: ['User interviews'],
              title: 'Personas (without the cringe)',
              timeMinutes: 20,
            },
            {
              level: 'Beginner',
              needs: ['User interviews'],
              title: 'Empathy maps',
              timeMinutes: 15,
            },
            {
              level: 'Intermediate',
              needs: [],
              title: 'Competitor analysis',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Personas'],
              title: 'Problem statements & HMW',
              timeMinutes: 20,
            },
          ],
          outcome: 'You can run a small research round and write a real problem statement.',
          subtitle: 'Find out what people need before you open Figma.',
          checkpoint: {
            time: 'about 3 hours',
            title: 'Interview 3 real humans',
          },
          quoteAfter: 'Talking to users is terrifying for ten minutes and useful for ten months.',
          prerequisites: ['02'],
        },
        {
          title: 'Wireframes & flows',
          number: '04',
          topics: [
            {
              level: 'Intermediate',
              needs: ['Problem statements & HMW'],
              title: 'User flows',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['User flows'],
              title: 'Information architecture',
              timeMinutes: 25,
            },
            {
              level: 'Beginner',
              needs: [],
              title: 'Sketching ideas fast',
              timeMinutes: 15,
            },
            {
              level: 'Intermediate',
              needs: ['Sketching ideas fast', 'User flows'],
              title: 'Low-fi wireframes',
              timeMinutes: 30,
            },
            {
              level: 'Intermediate',
              needs: ['Low-fi wireframes'],
              title: 'Mobile vs desktop patterns',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Low-fi wireframes'],
              title: 'Testing early',
              timeMinutes: 25,
            },
          ],
          outcome: 'You can map a flow and test a wireframe with real users.',
          subtitle: 'Turn an idea into something people can test.',
          checkpoint: {
            time: 'about 3 hours',
            title: 'Wireframe a 5-screen flow',
          },
          quoteAfter: "Your first wireframe will be ugly. That's the whole point.",
          prerequisites: ['03'],
        },
        {
          title: 'Figma, properly',
          number: '05',
          topics: [
            {
              level: 'Intermediate',
              needs: ['Setting up Figma'],
              title: 'Frames & auto layout',
              timeMinutes: 30,
            },
            {
              level: 'Intermediate',
              needs: ['Frames & auto layout'],
              title: 'Components & variants',
              timeMinutes: 30,
            },
            {
              level: 'Intermediate',
              needs: ['Components & variants'],
              title: 'Styles & variables',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Frames & auto layout'],
              title: 'Constraints & responsive',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Components & variants'],
              title: 'Prototyping basics',
              timeMinutes: 25,
            },
            {
              level: 'Advanced',
              needs: ['Styles & variables'],
              title: 'Design systems 101',
              timeMinutes: 35,
            },
            {
              level: 'Intermediate',
              needs: ['Color & contrast'],
              title: 'Accessibility basics',
              timeMinutes: 25,
            },
            {
              level: 'Advanced',
              needs: ['Design systems 101'],
              title: 'Handoff to developers',
              timeMinutes: 25,
            },
          ],
          outcome: "You can build files your future self and developers won't hate.",
          subtitle: 'Clean, reusable, developer-friendly files.',
          checkpoint: {
            time: 'about 4 hours',
            title: 'Build a mini component library',
          },
          quoteAfter: "Auto layout will betray you once. Then you'll never leave it.",
          prerequisites: ['04'],
        },
        {
          title: 'Build your portfolio',
          number: '06',
          topics: [
            {
              level: 'Beginner',
              needs: [],
              title: 'Pick a project worth showing',
              timeMinutes: 15,
            },
            {
              level: 'Intermediate',
              needs: ['Pick a project worth showing'],
              title: 'Structure a case study',
              timeMinutes: 25,
            },
            {
              level: 'Intermediate',
              needs: ['Structure a case study'],
              title: 'Write the story',
              timeMinutes: 30,
            },
            {
              level: 'Intermediate',
              needs: ['Visual hierarchy'],
              title: 'Polish your visuals',
              timeMinutes: 30,
            },
            {
              level: 'Beginner',
              needs: ['Write the story'],
              title: 'Publish & share it',
              timeMinutes: 20,
            },
          ],
          outcome: "You can publish a case study you're proud of.",
          subtitle: 'Package your work so people actually reply.',
          checkpoint: {
            time: 'about 6 hours',
            title: 'Publish your first case study',
          },
          prerequisites: ['05'],
        },
      ],
      subtitle:
        'From "what even is hierarchy?" to a case study that gets replies. One step at a time, tick things off as you go.',
      metaPills: ['6 stages', '38 topics', 'about 14 hours', 'Beginner → job-ready portfolio'],
      finishLine:
        "Now go ship it. Finish the six stages, publish your case study, and put it in front of real people. That's the whole game.",
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
      timelinePace: '6 weeks at 30 minutes a day',
      beforeYouStart: [
        {
          title: 'Total beginners, students and career switchers',
          bullets: [
            'No design background needed',
            'Zero Figma knowledge needed',
            'Curious about how apps feel good to use',
          ],
          colorLabel: 'WHO THIS IS FOR',
        },
        {
          title: 'Not much, honestly',
          bullets: ['A laptop and decent internet', 'A free Figma account', '30 minutes a day'],
          colorLabel: 'WHAT YOU NEED',
        },
        {
          title: 'Read, do, tick',
          bullets: [
            'Read the theory page (about 6 minutes)',
            'Complete the checkpoint at the end of each stage',
            'Tick it off and watch the progress bar move',
          ],
          colorLabel: 'HOW IT WORKS',
        },
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
            title: "Surveys that don't lie",
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
        byTheEnd: "publish a case study you're proud to share.",
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
  },
  {
    slug: 'graphic-designer',
    title: 'Graphic Designer',
    description:
      'Posters, brands, socials and print. Learn to make things people actually stop scrolling for.',
    position: 2,
    metadata: {
      label: '(Roadmap 02)',
      number: '02',
      quotes: [
        'Composition is just organized vibes.',
        "Your logo doesn't need to say everything. It needs to say one thing.",
      ],
      subtitle:
        'Posters, brands, socials and print. Learn to make things people actually stop scrolling for.',
      metaPills: ['3 stages', '16 topics', 'about 6 hours', 'Beginner friendly'],
      disciplines: [
        {
          label: 'UI/UX',
          active: false,
        },
        {
          label: 'Graphic design',
          active: true,
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
      timelinePace: '3 stages, one a week',
      betaNote:
        'Beta 1: Stage 01 is live. Stages 02 and 03 land week by week after launch, and your ticks carry over.',
      beforeYouStart: [
        {
          title: 'Creative people who want structure',
          bullets: [
            'No design background needed',
            'You love visuals and hate guessing',
            'You want to land freelance or studio work',
          ],
          colorLabel: 'WHO THIS IS FOR',
        },
        {
          title: 'Pick your favorite design tool',
          bullets: [
            'A laptop and decent internet',
            'Figma, Canva or Photoshop (any one)',
            '30 minutes a day',
          ],
          colorLabel: 'WHAT YOU NEED',
        },
        {
          title: 'Read, do, tick',
          bullets: ['Read the theory', 'Complete the checkpoint', 'Tick off your progress'],
          colorLabel: 'HOW IT WORKS',
        },
      ],
      finishLine:
        'Make it. Post it. Finish the stages, put your best piece out there, and let people tell you what they think.',
      stages: [
        {
          number: '01',
          title: 'Design foundations',
          subtitle: 'The rules behind every good poster.',
          prerequisites: [],
          outcome: 'You can make clean, balanced layouts with confidence.',
          topics: [
            {
              title: 'What graphic design actually is',
              needs: [],
              level: 'Beginner',
              timeMinutes: 10,
            },
            {
              title: 'Composition & balance',
              needs: [],
              level: 'Beginner',
              timeMinutes: 20,
            },
            {
              title: 'Typography that works',
              needs: [],
              level: 'Beginner',
              timeMinutes: 25,
            },
            {
              title: 'Color theory for humans',
              needs: [],
              level: 'Beginner',
              timeMinutes: 25,
            },
            {
              title: 'Layout & grids',
              needs: ['Composition & balance'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Contrast & hierarchy',
              needs: ['Typography that works'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
          ],
          checkpoint: {
            title: 'Redesign a poster you hate',
            time: 'about 2 hours',
          },
          quoteAfter: 'Composition is just organized vibes.',
        },
        {
          number: '02',
          title: 'Branding basics',
          subtitle: 'Logos, colors and a look that sticks.',
          prerequisites: ['01'],
          outcome: 'You can build a small brand identity from scratch.',
          topics: [
            {
              title: 'Brand identity 101',
              needs: [],
              level: 'Beginner',
              timeMinutes: 20,
            },
            {
              title: 'Logo design process',
              needs: ['Brand identity 101'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
            {
              title: 'Color & type for brands',
              needs: ['Logo design process'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Mockups that sell',
              needs: ['Logo design process'],
              level: 'Intermediate',
              timeMinutes: 20,
            },
            {
              title: 'Brand guidelines',
              needs: ['Color & type for brands'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
          ],
          quoteAfter: "Your logo doesn't need to say everything. It needs to say one thing.",
        },
        {
          number: '03',
          title: 'Social & print',
          subtitle: 'Where your work actually lives.',
          prerequisites: ['02'],
          outcome: 'You can ship posts, posters and print-ready files.',
          topics: [
            {
              title: 'Social post design',
              needs: [],
              level: 'Beginner',
              timeMinutes: 20,
            },
            {
              title: 'Posters & flyers',
              needs: ['Layout & grids'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Print basics (CMYK, bleed)',
              needs: [],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Exporting the right way',
              needs: [],
              level: 'Beginner',
              timeMinutes: 15,
            },
            {
              title: 'Portfolio for graphic designers',
              needs: ['Mockups that sell'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
          ],
        },
      ],
    },
    stages: [
      {
        position: 1,
        title: 'Design foundations',
        subtitle: 'The rules behind every good poster.',
        byTheEnd: 'You can make clean, balanced layouts with confidence.',
        weekLabel: 'Week 1',
        prerequisiteStage: null,
        topics: [
          {
            position: 1,
            title: 'What graphic design actually is',
            difficulty: 'beginner',
            estimatedMinutes: 10,
          },
          {
            position: 2,
            title: 'Composition & balance',
            difficulty: 'beginner',
            estimatedMinutes: 20,
          },
          {
            position: 3,
            title: 'Typography that works',
            difficulty: 'beginner',
            estimatedMinutes: 25,
          },
          {
            position: 4,
            title: 'Color theory for humans',
            difficulty: 'beginner',
            estimatedMinutes: 25,
          },
          {
            position: 5,
            title: 'Layout & grids',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 6,
            title: 'Contrast & hierarchy',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
        ],
        checkpoints: [
          {
            position: 1,
            task: 'Redesign a poster you hate',
            timeEstimate: 'about 2 hours',
          },
        ],
      },
      {
        position: 2,
        title: 'Branding basics',
        subtitle: 'Logos, colors and a look that sticks.',
        byTheEnd: 'You can build a small brand identity from scratch.',
        weekLabel: 'Week 2',
        prerequisiteStage: 1,
        topics: [
          {
            position: 7,
            title: 'Brand identity 101',
            difficulty: 'beginner',
            estimatedMinutes: 20,
          },
          {
            position: 8,
            title: 'Logo design process',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
          {
            position: 9,
            title: 'Color & type for brands',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 10,
            title: 'Mockups that sell',
            difficulty: 'intermediate',
            estimatedMinutes: 20,
          },
          {
            position: 11,
            title: 'Brand guidelines',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
        ],
        checkpoints: [],
      },
      {
        position: 3,
        title: 'Social & print',
        subtitle: 'Where your work actually lives.',
        byTheEnd: 'You can ship posts, posters and print-ready files.',
        weekLabel: 'Week 3',
        prerequisiteStage: 2,
        topics: [
          {
            position: 12,
            title: 'Social post design',
            difficulty: 'beginner',
            estimatedMinutes: 20,
          },
          {
            position: 13,
            title: 'Posters & flyers',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 14,
            title: 'Print basics (CMYK, bleed)',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 15,
            title: 'Exporting the right way',
            difficulty: 'beginner',
            estimatedMinutes: 15,
          },
          {
            position: 16,
            title: 'Portfolio for graphic designers',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
        ],
        checkpoints: [],
      },
    ],
  },
  {
    slug: 'product-designer',
    title: 'Product Designer',
    description:
      'Think beyond screens. Frame problems, pick what matters, and ship with engineers.',
    position: 3,
    metadata: {
      label: '(Roadmap 03)',
      number: '03',
      quotes: [
        'A good product designer deletes more than they add.',
        'Nobody remembers your pixel-perfect empty state. They remember it solved their problem.',
      ],
      subtitle: 'Think beyond screens. Frame problems, pick what matters, and ship with engineers.',
      metaPills: ['3 stages', '16 topics', 'about 7 hours', 'Beginner friendly'],
      disciplines: [
        {
          label: 'UI/UX',
          active: false,
        },
        {
          label: 'Graphic design',
          active: false,
        },
        {
          label: 'Product design',
          active: true,
        },
        {
          label: 'Design engineering',
          active: false,
        },
      ],
      timelinePace: '3 stages, one a week',
      beforeYouStart: [
        {
          title: 'Designers who want to own the why',
          bullets: [
            'You know a little UI or UX already',
            "You're curious about metrics and strategy",
            "You're aiming for product roles",
          ],
          colorLabel: 'WHO THIS IS FOR',
        },
        {
          title: 'Not much, honestly',
          bullets: ['A laptop and decent internet', 'A free Figma account', '30 minutes a day'],
          colorLabel: 'WHAT YOU NEED',
        },
        {
          title: 'Read, do, tick',
          bullets: ['Read the theory', 'Complete the checkpoint', 'Tick off your progress'],
          colorLabel: 'HOW IT WORKS',
        },
      ],
      finishLine:
        'Go own the problem. Finish the stages, write your first product case study, and show how you think, not just how you draw.',
      stages: [
        {
          number: '01',
          title: 'Think like a product designer',
          subtitle: 'Problems first, pixels later.',
          prerequisites: [],
          outcome: 'You can frame a problem and write a one-page brief.',
          topics: [
            {
              title: 'Product vs UI/UX designer',
              needs: [],
              level: 'Beginner',
              timeMinutes: 10,
            },
            {
              title: 'Understanding the problem',
              needs: [],
              level: 'Beginner',
              timeMinutes: 20,
            },
            {
              title: 'Users, needs and jobs',
              needs: ['Understanding the problem'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Product metrics 101',
              needs: ['Understanding the problem'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Prioritization (without the drama)',
              needs: ['Product metrics 101'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Writing a one-page brief',
              needs: ['Users, needs and jobs'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
          ],
          checkpoint: {
            title: 'Write a one-page product brief',
            time: 'about 2 hours',
          },
          quoteAfter: 'A good product designer deletes more than they add.',
        },
        {
          number: '02',
          title: 'From idea to flow',
          subtitle: 'Scope it, map it, test it.',
          prerequisites: ['01'],
          outcome: 'You can take an idea from rough scope to a tested flow.',
          topics: [
            {
              title: 'Competitor & market scan',
              needs: [],
              level: 'Beginner',
              timeMinutes: 25,
            },
            {
              title: 'User flows & journeys',
              needs: ['Writing a one-page brief'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'MVP scoping',
              needs: ['Prioritization (without the drama)'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Wireframes with intent',
              needs: ['User flows & journeys'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
            {
              title: 'Validating with users',
              needs: ['Wireframes with intent'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
          ],
          quoteAfter:
            'Nobody remembers your pixel-perfect empty state. They remember it solved their problem.',
        },
        {
          number: '03',
          title: 'Ship it together',
          subtitle: 'Work with engineers, measure what happens.',
          prerequisites: ['02'],
          outcome: 'You can hand off cleanly and show your impact.',
          topics: [
            {
              title: 'Working with engineers',
              needs: [],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Specs & handoff',
              needs: ['Working with engineers'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Design reviews',
              needs: [],
              level: 'Beginner',
              timeMinutes: 20,
            },
            {
              title: 'Measuring impact',
              needs: ['Product metrics 101'],
              level: 'Advanced',
              timeMinutes: 30,
            },
            {
              title: 'Product case studies',
              needs: ['Measuring impact'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
          ],
        },
      ],
    },
    stages: [
      {
        position: 1,
        title: 'Think like a product designer',
        subtitle: 'Problems first, pixels later.',
        byTheEnd: 'You can frame a problem and write a one-page brief.',
        weekLabel: 'Week 1',
        prerequisiteStage: null,
        topics: [
          {
            position: 1,
            title: 'Product vs UI/UX designer',
            difficulty: 'beginner',
            estimatedMinutes: 10,
          },
          {
            position: 2,
            title: 'Understanding the problem',
            difficulty: 'beginner',
            estimatedMinutes: 20,
          },
          {
            position: 3,
            title: 'Users, needs and jobs',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 4,
            title: 'Product metrics 101',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 5,
            title: 'Prioritization (without the drama)',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 6,
            title: 'Writing a one-page brief',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
        ],
        checkpoints: [
          {
            position: 1,
            task: 'Write a one-page product brief',
            timeEstimate: 'about 2 hours',
          },
        ],
      },
      {
        position: 2,
        title: 'From idea to flow',
        subtitle: 'Scope it, map it, test it.',
        byTheEnd: 'You can take an idea from rough scope to a tested flow.',
        weekLabel: 'Week 2',
        prerequisiteStage: 1,
        topics: [
          {
            position: 7,
            title: 'Competitor & market scan',
            difficulty: 'beginner',
            estimatedMinutes: 25,
          },
          {
            position: 8,
            title: 'User flows & journeys',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 9,
            title: 'MVP scoping',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 10,
            title: 'Wireframes with intent',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
          {
            position: 11,
            title: 'Validating with users',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
        ],
        checkpoints: [],
      },
      {
        position: 3,
        title: 'Ship it together',
        subtitle: 'Work with engineers, measure what happens.',
        byTheEnd: 'You can hand off cleanly and show your impact.',
        weekLabel: 'Week 3',
        prerequisiteStage: 2,
        topics: [
          {
            position: 12,
            title: 'Working with engineers',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 13,
            title: 'Specs & handoff',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 14,
            title: 'Design reviews',
            difficulty: 'beginner',
            estimatedMinutes: 20,
          },
          {
            position: 15,
            title: 'Measuring impact',
            difficulty: 'advanced',
            estimatedMinutes: 30,
          },
          {
            position: 16,
            title: 'Product case studies',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
        ],
        checkpoints: [],
      },
    ],
  },
  {
    slug: 'design-engineer',
    title: 'Design Engineer',
    description:
      'Design it, then build it. Be the person who closes the gap between Figma and the browser.',
    position: 4,
    metadata: {
      label: '(Roadmap 04)',
      number: '04',
      quotes: ['Pixel-perfect is a love language.', 'Your first div soup is a rite of passage.'],
      subtitle:
        'Design it, then build it. Be the person who closes the gap between Figma and the browser.',
      metaPills: ['3 stages', '16 topics', 'about 8 hours', 'Beginner friendly'],
      disciplines: [
        {
          label: 'UI/UX',
          active: false,
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
          active: true,
        },
      ],
      timelinePace: '3 stages, one a week',
      beforeYouStart: [
        {
          title: 'Designers curious about code, or developers with taste',
          bullets: [
            'You know basic design or basic code',
            "You hate 'it looked different in Figma'",
            'You want to build your own portfolio',
          ],
          colorLabel: 'WHO THIS IS FOR',
        },
        {
          title: 'Just the essentials',
          bullets: [
            'A laptop and decent internet',
            'A code editor (VS Code is fine)',
            '30 minutes a day',
          ],
          colorLabel: 'WHAT YOU NEED',
        },
        {
          title: 'Read, do, tick',
          bullets: ['Read the theory', 'Complete the checkpoint', 'Tick off your progress'],
          colorLabel: 'HOW IT WORKS',
        },
      ],
      finishLine:
        'Build the thing. Finish the stages, ship a real site, and become the designer developers actually want to sit next to.',
      stages: [
        {
          number: '01',
          title: 'Code for designers',
          subtitle: 'Just enough HTML and CSS to be dangerous.',
          prerequisites: [],
          outcome: 'You can build a responsive page from a Figma design.',
          topics: [
            {
              title: 'What a design engineer does',
              needs: [],
              level: 'Beginner',
              timeMinutes: 10,
            },
            {
              title: 'HTML structure',
              needs: [],
              level: 'Beginner',
              timeMinutes: 25,
            },
            {
              title: 'CSS basics',
              needs: ['HTML structure'],
              level: 'Beginner',
              timeMinutes: 30,
            },
            {
              title: 'Flexbox & grid',
              needs: ['CSS basics'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
            {
              title: 'Responsive CSS',
              needs: ['Flexbox & grid'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
            {
              title: 'Browser dev tools',
              needs: [],
              level: 'Beginner',
              timeMinutes: 20,
            },
          ],
          checkpoint: {
            title: 'Rebuild a landing page in code',
            time: 'about 4 hours',
          },
          quoteAfter: 'Pixel-perfect is a love language.',
        },
        {
          number: '02',
          title: 'Design meets code',
          subtitle: 'Tokens, components and motion.',
          prerequisites: ['01'],
          outcome: 'You can turn a Figma system into real components.',
          topics: [
            {
              title: 'Design tokens',
              needs: [],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Components in React',
              needs: ['Responsive CSS'],
              level: 'Advanced',
              timeMinutes: 40,
            },
            {
              title: 'Animations & motion',
              needs: ['CSS basics'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
            {
              title: 'Accessibility in code',
              needs: ['HTML structure'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Figma to code',
              needs: ['Design tokens'],
              level: 'Intermediate',
              timeMinutes: 30,
            },
          ],
          quoteAfter: 'Your first div soup is a rite of passage.',
        },
        {
          number: '03',
          title: 'Build & ship',
          subtitle: 'Git, deploys and a portfolio that is the product.',
          prerequisites: ['02'],
          outcome: 'You can deploy a site you built yourself.',
          topics: [
            {
              title: 'Git basics',
              needs: [],
              level: 'Intermediate',
              timeMinutes: 30,
            },
            {
              title: 'Deploying a site',
              needs: ['Git basics'],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Building a design system in code',
              needs: ['Components in React'],
              level: 'Advanced',
              timeMinutes: 40,
            },
            {
              title: 'Performance for designers',
              needs: [],
              level: 'Intermediate',
              timeMinutes: 25,
            },
            {
              title: 'Your portfolio as a product',
              needs: ['Deploying a site'],
              level: 'Intermediate',
              timeMinutes: 35,
            },
          ],
        },
      ],
    },
    stages: [
      {
        position: 1,
        title: 'Code for designers',
        subtitle: 'Just enough HTML and CSS to be dangerous.',
        byTheEnd: 'You can build a responsive page from a Figma design.',
        weekLabel: 'Week 1',
        prerequisiteStage: null,
        topics: [
          {
            position: 1,
            title: 'What a design engineer does',
            difficulty: 'beginner',
            estimatedMinutes: 10,
          },
          {
            position: 2,
            title: 'HTML structure',
            difficulty: 'beginner',
            estimatedMinutes: 25,
          },
          {
            position: 3,
            title: 'CSS basics',
            difficulty: 'beginner',
            estimatedMinutes: 30,
          },
          {
            position: 4,
            title: 'Flexbox & grid',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
          {
            position: 5,
            title: 'Responsive CSS',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
          {
            position: 6,
            title: 'Browser dev tools',
            difficulty: 'beginner',
            estimatedMinutes: 20,
          },
        ],
        checkpoints: [
          {
            position: 1,
            task: 'Rebuild a landing page in code',
            timeEstimate: 'about 4 hours',
          },
        ],
      },
      {
        position: 2,
        title: 'Design meets code',
        subtitle: 'Tokens, components and motion.',
        byTheEnd: 'You can turn a Figma system into real components.',
        weekLabel: 'Week 2',
        prerequisiteStage: 1,
        topics: [
          {
            position: 7,
            title: 'Design tokens',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 8,
            title: 'Components in React',
            difficulty: 'advanced',
            estimatedMinutes: 40,
          },
          {
            position: 9,
            title: 'Animations & motion',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
          {
            position: 10,
            title: 'Accessibility in code',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 11,
            title: 'Figma to code',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
        ],
        checkpoints: [],
      },
      {
        position: 3,
        title: 'Build & ship',
        subtitle: 'Git, deploys and a portfolio that is the product.',
        byTheEnd: 'You can deploy a site you built yourself.',
        weekLabel: 'Week 3',
        prerequisiteStage: 2,
        topics: [
          {
            position: 12,
            title: 'Git basics',
            difficulty: 'intermediate',
            estimatedMinutes: 30,
          },
          {
            position: 13,
            title: 'Deploying a site',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 14,
            title: 'Building a design system in code',
            difficulty: 'advanced',
            estimatedMinutes: 40,
          },
          {
            position: 15,
            title: 'Performance for designers',
            difficulty: 'intermediate',
            estimatedMinutes: 25,
          },
          {
            position: 16,
            title: 'Your portfolio as a product',
            difficulty: 'intermediate',
            estimatedMinutes: 35,
          },
        ],
        checkpoints: [],
      },
    ],
  },
];
