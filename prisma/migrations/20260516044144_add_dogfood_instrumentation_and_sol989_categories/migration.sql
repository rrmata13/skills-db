-- AlterTable
ALTER TABLE "UserQuery" ADD COLUMN "corpusSha" TEXT;
ALTER TABLE "UserQuery" ADD COLUMN "scorerVersion" TEXT;

-- CreateTable
CREATE TABLE "SkillUse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userQueryId" TEXT,
    "queryMatchId" TEXT,
    "skillId" TEXT NOT NULL,
    "useType" TEXT NOT NULL,
    "rank" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillUse_userQueryId_fkey" FOREIGN KEY ("userQueryId") REFERENCES "UserQuery" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SkillUse_queryMatchId_fkey" FOREIGN KEY ("queryMatchId") REFERENCES "QueryMatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SkillUse_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QueryMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queryTaskId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "score" REAL NOT NULL,
    "lexicalScore" REAL NOT NULL DEFAULT 0,
    "semanticScore" REAL NOT NULL DEFAULT 0,
    "ruleScore" REAL NOT NULL DEFAULT 0,
    "rationale" TEXT,
    CONSTRAINT "QueryMatch_queryTaskId_fkey" FOREIGN KEY ("queryTaskId") REFERENCES "QueryTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QueryMatch_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QueryMatch" ("id", "lexicalScore", "queryTaskId", "rationale", "ruleScore", "score", "semanticScore", "skillId") SELECT "id", "lexicalScore", "queryTaskId", "rationale", "ruleScore", "score", "semanticScore", "skillId" FROM "QueryMatch";
DROP TABLE "QueryMatch";
ALTER TABLE "new_QueryMatch" RENAME TO "QueryMatch";
CREATE INDEX "QueryMatch_queryTaskId_rank_idx" ON "QueryMatch"("queryTaskId", "rank");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SkillUse_skillId_idx" ON "SkillUse"("skillId");

-- CreateIndex
CREATE INDEX "SkillUse_userQueryId_idx" ON "SkillUse"("userQueryId");

-- CreateIndex
CREATE INDEX "SkillUse_createdAt_idx" ON "SkillUse"("createdAt");

-- CreateIndex
CREATE INDEX "SkillUse_useType_idx" ON "SkillUse"("useType");

-- CreateIndex
CREATE INDEX "SkillUse_rank_idx" ON "SkillUse"("rank");

-- CreateIndex
CREATE INDEX "UserQuery_createdAt_idx" ON "UserQuery"("createdAt");
