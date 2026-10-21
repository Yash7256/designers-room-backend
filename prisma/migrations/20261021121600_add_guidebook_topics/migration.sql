-- CreateTable
CREATE TABLE "GuidebookTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidebookTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuidebookTopic_slug_key" ON "GuidebookTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GuidebookTopic_objectKey_key" ON "GuidebookTopic"("objectKey");

-- CreateIndex
CREATE INDEX "GuidebookTopic_position_idx" ON "GuidebookTopic"("position");
