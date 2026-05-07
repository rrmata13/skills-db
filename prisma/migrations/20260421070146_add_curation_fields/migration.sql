-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceRepositoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "rawContent" TEXT,
    "embeddingText" TEXT,
    "imageUrl" TEXT,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "repoUrl" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "confidenceBase" REAL NOT NULL DEFAULT 0.5,
    "lastSyncedAt" DATETIME,
    "curationStatus" TEXT NOT NULL DEFAULT 'unreviewed',
    "notes" TEXT,
    "installedAt" DATETIME,
    "installedPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Skill_sourceRepositoryId_fkey" FOREIGN KEY ("sourceRepositoryId") REFERENCES "SourceRepository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Skill" ("authorName", "authorUrl", "confidenceBase", "createdAt", "description", "embeddingText", "id", "imageUrl", "lastSyncedAt", "longDescription", "name", "rating", "rawContent", "repoUrl", "slug", "sourceRepositoryId", "updatedAt") SELECT "authorName", "authorUrl", "confidenceBase", "createdAt", "description", "embeddingText", "id", "imageUrl", "lastSyncedAt", "longDescription", "name", "rating", "rawContent", "repoUrl", "slug", "sourceRepositoryId", "updatedAt" FROM "Skill";
DROP TABLE "Skill";
ALTER TABLE "new_Skill" RENAME TO "Skill";
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");
CREATE INDEX "Skill_sourceRepositoryId_idx" ON "Skill"("sourceRepositoryId");
CREATE INDEX "Skill_name_idx" ON "Skill"("name");
CREATE INDEX "Skill_curationStatus_idx" ON "Skill"("curationStatus");
CREATE INDEX "Skill_installedAt_idx" ON "Skill"("installedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
