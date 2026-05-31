-- DropIndex
DROP INDEX IF EXISTS "Entry_authorId_idx";

-- CreateIndex
CREATE INDEX "Entry_authorId_isDraft_idx" ON "Entry"("authorId", "isDraft");
