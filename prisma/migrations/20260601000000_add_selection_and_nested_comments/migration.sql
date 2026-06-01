-- Drop old index
DROP INDEX IF EXISTS "Comment_entryId_paragraphIndex_idx";

-- Drop old column
ALTER TABLE "Comment" DROP COLUMN "paragraphIndex";

-- Add new columns for text selection
ALTER TABLE "Comment" ADD COLUMN "selectedText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Comment" ADD COLUMN "startOffset" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Comment" ADD COLUMN "endOffset" INTEGER NOT NULL DEFAULT 0;

-- Add parent comment relation for nested comments
ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;

-- Add new index
CREATE INDEX "Comment_entryId_startOffset_endOffset_idx" ON "Comment"("entryId", "startOffset", "endOffset");

-- Add self-referencing foreign key
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
