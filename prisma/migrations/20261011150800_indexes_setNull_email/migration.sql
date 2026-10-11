-- AlterTable: make userId on Roadmap optional (SetNull on user delete)
ALTER TABLE "Roadmap" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterForeignKey: change onDelete from CASCADE to SET NULL
ALTER TABLE "Roadmap" DROP CONSTRAINT "Roadmap_userId_fkey";
ALTER TABLE "Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: composite index for roadmap list ordering
CREATE INDEX "Roadmap_createdAt_id_idx" ON "Roadmap"("createdAt" DESC, "id" DESC);

-- DropIndex: old single-column Topic index
DROP INDEX "Topic_roadmapId_idx";

-- CreateIndex: composite index for topic ordering within roadmap
CREATE INDEX "Topic_roadmapId_position_idx" ON "Topic"("roadmapId", "position");

-- CreateIndex: unique constraint to prevent duplicate positions
CREATE UNIQUE INDEX "Topic_roadmapId_position_key" ON "Topic"("roadmapId", "position");
