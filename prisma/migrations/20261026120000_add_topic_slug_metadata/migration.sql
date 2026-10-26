-- AlterTable
ALTER TABLE "Topic"
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Topic_roadmapId_slug_key" ON "Topic"("roadmapId", "slug");
