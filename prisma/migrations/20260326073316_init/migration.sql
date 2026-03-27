-- CreateTable
CREATE TABLE "SourceRepository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "githubUrl" TEXT,
    "description" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Skill" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Skill_sourceRepositoryId_fkey" FOREIGN KEY ("sourceRepositoryId") REFERENCES "SourceRepository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    CONSTRAINT "SkillCategory_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    CONSTRAINT "SkillTag_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "inputType" TEXT,
    "outputType" TEXT,
    CONSTRAINT "SkillCapability_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromSkillId" TEXT NOT NULL,
    "toSkillId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    CONSTRAINT "SkillRelation_fromSkillId_fkey" FOREIGN KEY ("fromSkillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkillRelation_toSkillId_fkey" FOREIGN KEY ("toSkillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceRepositoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "SyncJob_sourceRepositoryId_fkey" FOREIGN KEY ("sourceRepositoryId") REFERENCES "SourceRepository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawInput" TEXT NOT NULL,
    "queryType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QueryTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userQueryId" TEXT NOT NULL,
    "taskText" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "parentTaskId" TEXT,
    CONSTRAINT "QueryTask_userQueryId_fkey" FOREIGN KEY ("userQueryId") REFERENCES "UserQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueryMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queryTaskId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "lexicalScore" REAL NOT NULL DEFAULT 0,
    "semanticScore" REAL NOT NULL DEFAULT 0,
    "ruleScore" REAL NOT NULL DEFAULT 0,
    "rationale" TEXT,
    CONSTRAINT "QueryMatch_queryTaskId_fkey" FOREIGN KEY ("queryTaskId") REFERENCES "QueryTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QueryMatch_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceRepository_slug_key" ON "SourceRepository"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRepository_sourceUrl_key" ON "SourceRepository"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_sourceRepositoryId_idx" ON "Skill"("sourceRepositoryId");

-- CreateIndex
CREATE INDEX "Skill_name_idx" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "SkillCategory_category_idx" ON "SkillCategory"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_skillId_category_key" ON "SkillCategory"("skillId", "category");

-- CreateIndex
CREATE INDEX "SkillTag_tag_idx" ON "SkillTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTag_skillId_tag_key" ON "SkillTag"("skillId", "tag");

-- CreateIndex
CREATE INDEX "SkillCapability_skillId_idx" ON "SkillCapability"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillRelation_fromSkillId_toSkillId_relationType_key" ON "SkillRelation"("fromSkillId", "toSkillId", "relationType");
