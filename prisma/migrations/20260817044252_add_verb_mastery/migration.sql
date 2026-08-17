-- AlterTable
ALTER TABLE "VerbPracticeMessage" ADD COLUMN "targetPerson" TEXT;
ALTER TABLE "VerbPracticeMessage" ADD COLUMN "targetVerb" TEXT;

-- CreateTable
CREATE TABLE "VerbMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verb" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "lastResult" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VerbMastery_verb_person_key" ON "VerbMastery"("verb", "person");
