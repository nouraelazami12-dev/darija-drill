-- CreateTable
CREATE TABLE "RoleplaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "scriptFormat" TEXT NOT NULL,
    "targetPhraseIds" TEXT NOT NULL DEFAULT '[]',
    "usedPhraseIds" TEXT NOT NULL DEFAULT '[]',
    "modeledPhraseIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleplaySession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "sessionId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RoleplaySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("content", "createdAt", "id", "role", "scenarioId") SELECT "content", "createdAt", "id", "role", "scenarioId" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE INDEX "ChatMessage_scenarioId_idx" ON "ChatMessage"("scenarioId");
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RoleplaySession_scenarioId_idx" ON "RoleplaySession"("scenarioId");
