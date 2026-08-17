-- CreateTable
CREATE TABLE "VerbPracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "verbs" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VerbPracticeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "translation" TEXT,
    "correction" TEXT,
    "feedback" TEXT,
    "verdict" TEXT,
    "correctAnswer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerbPracticeMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VerbPracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VerbPracticeMessage_sessionId_idx" ON "VerbPracticeMessage"("sessionId");
