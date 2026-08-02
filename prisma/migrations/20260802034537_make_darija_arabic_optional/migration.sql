-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Phrase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "darijaArabic" TEXT,
    "darijaLatin" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "notes" TEXT,
    "tag" TEXT,
    "audioUrl" TEXT,
    "box" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Phrase" ("audioUrl", "box", "createdAt", "darijaArabic", "darijaLatin", "english", "id", "nextReviewAt", "notes", "tag", "updatedAt") SELECT "audioUrl", "box", "createdAt", "darijaArabic", "darijaLatin", "english", "id", "nextReviewAt", "notes", "tag", "updatedAt" FROM "Phrase";
DROP TABLE "Phrase";
ALTER TABLE "new_Phrase" RENAME TO "Phrase";
CREATE INDEX "Phrase_nextReviewAt_idx" ON "Phrase"("nextReviewAt");
CREATE INDEX "Phrase_tag_idx" ON "Phrase"("tag");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
