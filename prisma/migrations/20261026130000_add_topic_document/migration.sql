-- CreateTable
CREATE TABLE "TopicDocument" (
    "topicId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text/markdown; charset=utf-8',
    "sizeBytes" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicDocument_pkey" PRIMARY KEY ("topicId")
);

-- AddForeignKey
ALTER TABLE "TopicDocument" ADD CONSTRAINT "TopicDocument_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
