import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { TopicMetadata } from '../src/guidebook/guidebook.types.js';

const MAX_MARKDOWN_BYTES = 512 * 1024;
const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

type ImportItem = {
  slug: string;
  position: number;
  title: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  file: string;
  metadata: TopicMetadata;
};

type ImportManifest = {
  roadmapSlug: string;
  stage: number;
  items: ImportItem[];
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const contentDirectory = resolve(scriptDirectory, '../content/ui-ux/01-foundations');
const manifestPath = resolve(contentDirectory, 'manifest.json');
const dryRun = process.argv.includes('--dry-run');

function assertManifest(value: unknown): ImportManifest {
  if (!value || typeof value !== 'object') {
    throw new Error('manifest.json must contain an object');
  }

  const manifest = value as Partial<ImportManifest>;
  if (typeof manifest.roadmapSlug !== 'string' || !manifest.roadmapSlug.trim()) {
    throw new Error('manifest.json is missing roadmapSlug');
  }
  if (!Number.isInteger(manifest.stage) || (manifest.stage ?? 0) < 1) {
    throw new Error('manifest.json is missing a valid stage');
  }
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    throw new Error('manifest.json is missing items');
  }

  const slugs = new Set<string>();
  const positions = new Set<number>();
  for (const item of manifest.items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Every manifest item must be an object');
    }
    if (typeof item.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
      throw new Error(`Invalid item slug: ${String(item.slug)}`);
    }
    if (!Number.isInteger(item.position) || item.position < 1) {
      throw new Error(`Invalid item position for ${item.slug}`);
    }
    if (typeof item.title !== 'string' || !item.title.trim()) {
      throw new Error(`Invalid item title for ${item.slug}`);
    }
    if (typeof item.file !== 'string' || !item.file.endsWith('.md')) {
      throw new Error(`Invalid item file for ${item.slug}`);
    }
    if (!item.metadata || typeof item.metadata !== 'object') {
      throw new Error(`Invalid item metadata for ${item.slug}`);
    }
    if (slugs.has(item.slug)) {
      throw new Error(`Duplicate item slug: ${item.slug}`);
    }
    if (positions.has(item.position)) {
      throw new Error(`Duplicate item position: ${item.position}`);
    }
    slugs.add(item.slug);
    positions.add(item.position);
  }

  return manifest as ImportManifest;
}

async function readMarkdown(file: string): Promise<string> {
  const body = await readFile(resolve(contentDirectory, file), 'utf-8');
  const size = Buffer.byteLength(body, 'utf-8');
  if (size > MAX_MARKDOWN_BYTES) {
    throw new Error(`${file} is larger than ${MAX_MARKDOWN_BYTES} bytes`);
  }
  if (!body.trim()) {
    throw new Error(`${file} is empty`);
  }
  return body;
}

function createStorage(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME must be set',
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

async function run() {
  const manifest = assertManifest(
    JSON.parse(await readFile(manifestPath, 'utf-8')) as unknown,
  );

  const bodies = new Map<string, string>();
  for (const item of manifest.items) {
    bodies.set(item.file, await readMarkdown(item.file));
  }

  if (dryRun) {
    console.log(
      `Validated ${manifest.items.length} topic(s) for ${manifest.roadmapSlug} / stage ${manifest.stage}.`,
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set');
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error('R2_BUCKET_NAME must be set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const storage = createStorage();

  try {
    const roadmap = await prisma.roadmap.findUnique({
      where: { slug: manifest.roadmapSlug },
      select: { id: true, slug: true },
    });
    if (!roadmap) {
      throw new Error(
        `Roadmap "${manifest.roadmapSlug}" was not found. Run the seed first, then retry the import.`,
      );
    }

    const stage = await prisma.stage.findUnique({
      where: { roadmapId_position: { roadmapId: roadmap.id, position: manifest.stage } },
      select: { title: true },
    });
    if (!stage) {
      throw new Error(
        `Stage ${manifest.stage} was not found on roadmap "${manifest.roadmapSlug}".`,
      );
    }

    let uploaded = 0;
    let skipped = 0;

    for (const item of manifest.items) {
      const body = bodies.get(item.file) as string;
      const contentHash = createHash('sha256').update(body).digest('hex');
      const metadata: TopicMetadata = { ...item.metadata, contentHash };

      const existing = await prisma.topic.findUnique({
        where: {
          roadmapId_position: { roadmapId: roadmap.id, position: item.position },
        },
        select: { id: true, objectKey: true, metadata: true },
      });

      const topic = existing
        ? await prisma.topic.update({
            where: { id: existing.id },
            data: {
              title: item.title,
              slug: item.slug,
              description: item.description,
              stage: manifest.stage,
              difficulty: item.difficulty,
              estimatedMinutes: item.estimatedMinutes,
              metadata: metadata as Prisma.InputJsonValue,
            },
          })
        : await prisma.topic.create({
            data: {
              roadmapId: roadmap.id,
              position: item.position,
              title: item.title,
              slug: item.slug,
              description: item.description,
              stage: manifest.stage,
              difficulty: item.difficulty,
              estimatedMinutes: item.estimatedMinutes,
              metadata: metadata as Prisma.InputJsonValue,
            },
          });

      const existingMetadata = (existing?.metadata as TopicMetadata | null) ?? null;
      if (existing?.objectKey && existingMetadata?.contentHash === contentHash) {
        skipped += 1;
        console.log(`· ${item.slug}: unchanged`);
        continue;
      }

      const objectKey = `roadmaps/${roadmap.id}/topics/${topic.id}/${randomUUID()}.md`;
      await storage.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: Buffer.from(body, 'utf-8'),
          ContentType: MARKDOWN_CONTENT_TYPE,
        }),
      );

      try {
        await prisma.topic.update({
          where: { id: topic.id },
          data: { objectKey, metadata: metadata as Prisma.InputJsonValue },
        });
      } catch (error) {
        await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
        throw error;
      }

      if (existing?.objectKey && existing.objectKey !== objectKey) {
        await storage.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: existing.objectKey }),
        );
      }

      uploaded += 1;
      console.log(`✓ ${item.slug}: uploaded`);
    }

    console.log(
      `Imported ${manifest.items.length} topic(s) for ${roadmap.slug} / stage ${manifest.stage}: ` +
        `${uploaded} uploaded, ${skipped} unchanged.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
