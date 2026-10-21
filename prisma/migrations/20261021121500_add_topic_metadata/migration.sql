-- AddOptionalColumns
ALTER TABLE "Topic"
ADD COLUMN     "stage" INTEGER,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "estimatedMinutes" INTEGER;
