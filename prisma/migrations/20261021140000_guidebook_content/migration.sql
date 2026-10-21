-- AlterTable
ALTER TABLE "Roadmap"
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "metadata" JSONB;

-- Backfill slugs for any pre-existing roadmap rows
UPDATE "Roadmap" SET "slug" = lower(replace("id", '-', '')) WHERE "slug" = '';

-- AlterTable
ALTER TABLE "Roadmap" ALTER COLUMN "slug" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN "objectKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Roadmap_slug_key" ON "Roadmap"("slug");

-- CreateIndex
CREATE INDEX "Roadmap_position_idx" ON "Roadmap"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_objectKey_key" ON "Topic"("objectKey");

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "byTheEnd" TEXT,
    "weekLabel" TEXT,
    "prerequisiteStage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roadmapId" TEXT NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stage_roadmapId_position_key" ON "Stage"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "Stage_roadmapId_position_idx" ON "Stage"("roadmapId", "position");

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "task" TEXT NOT NULL,
    "timeEstimate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stageId" TEXT NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Checkpoint_stageId_position_idx" ON "Checkpoint"("stageId", "position");

-- CreateTable
CREATE TABLE "TopicProgress" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "TopicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicProgress_userId_topicId_key" ON "TopicProgress"("userId", "topicId");

-- CreateIndex
CREATE INDEX "TopicProgress_userId_idx" ON "TopicProgress"("userId");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "GuidebookTopic";
