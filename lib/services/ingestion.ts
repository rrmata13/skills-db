import { prisma } from "@/lib/db";
import { SourceAdapter } from "@/lib/adapters/types";
import { AgentSkillsCCAdapter } from "@/lib/adapters/agent-skills-cc";
import { GitHubAdapter, GitHubFetchError } from "@/lib/adapters/github-adapter";
import { MockAdapter } from "@/lib/adapters/mock-adapter";
import { SOURCE_REPOSITORIES } from "@/lib/constants";
import { SourceAdapterResult } from "@/types";

// GitHubAdapter is preferred — it scrapes real SKILL.md files. The agent-skills.cc
// adapter is a secondary path for sources without a GitHub mapping. Mock is only
// used when explicitly opted-in via INGESTION_USE_MOCK=1.
const adapters: SourceAdapter[] = [
  new GitHubAdapter(),
  new AgentSkillsCCAdapter(),
];

function findAdapter(sourceSlug: string, sourceUrl: string): SourceAdapter | null {
  // GitHubAdapter takes precedence when the slug is mapped to a real repo.
  const github = adapters.find((a) => a.name === "github");
  if (github && github.canHandle(sourceSlug)) return github;
  return adapters.find((a) => a.canHandle(sourceUrl)) || null;
}

export async function upsertFromResult(result: SourceAdapterResult) {
  // Upsert source repository — single statement, no relations to manage.
  const source = await prisma.sourceRepository.upsert({
    where: { slug: result.source.slug },
    update: {
      name: result.source.name,
      author: result.source.author,
      description: result.source.description,
      githubUrl: result.source.githubUrl,
      rating: result.source.rating,
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
      syncError: null,
    },
    create: {
      slug: result.source.slug,
      name: result.source.name,
      author: result.source.author,
      sourceUrl: result.source.sourceUrl,
      githubUrl: result.source.githubUrl,
      description: result.source.description,
      rating: result.source.rating,
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
    },
  });

  // Upsert each skill + its relations in a single transaction. This protects
  // against concurrent syncs of the same source: the delete-then-recreate of
  // categories/tags/capabilities now happens atomically per skill, so parallel
  // writers can't observe a half-cleared state.
  for (const skill of result.skills) {
    const slug = skill.slug || `${result.source.slug}-${skill.name.toLowerCase().replace(/\s+/g, "-")}`;

    const embeddingText = [
      skill.name,
      skill.description,
      ...(skill.tags || []),
      ...(skill.categories || []),
      ...(skill.capabilities?.map((c) => c.capability) || []),
    ].join(" ");

    const allTags = [...new Set([...(skill.tags || []), ...(skill.keywords || [])])];

    await prisma.$transaction(async (tx) => {
      const upsertedSkill = await tx.skill.upsert({
        where: { slug },
        update: {
          name: skill.name,
          description: skill.description,
          longDescription: skill.longDescription || null,
          rawContent: skill.rawContent || null,
          embeddingText,
          imageUrl: skill.imageUrl || null,
          authorName: skill.authorName || null,
          authorUrl: skill.authorUrl || null,
          repoUrl: skill.repoUrl || null,
          rating: skill.rating || 0,
          lastSyncedAt: new Date(),
        },
        create: {
          sourceRepositoryId: source.id,
          name: skill.name,
          slug,
          description: skill.description,
          longDescription: skill.longDescription || null,
          rawContent: skill.rawContent || null,
          embeddingText,
          imageUrl: skill.imageUrl || null,
          authorName: skill.authorName || null,
          authorUrl: skill.authorUrl || null,
          repoUrl: skill.repoUrl || null,
          rating: skill.rating || 0,
          lastSyncedAt: new Date(),
        },
      });

      await tx.skillCategory.deleteMany({ where: { skillId: upsertedSkill.id } });
      await tx.skillTag.deleteMany({ where: { skillId: upsertedSkill.id } });
      await tx.skillCapability.deleteMany({ where: { skillId: upsertedSkill.id } });

      if (skill.categories?.length) {
        await tx.skillCategory.createMany({
          data: skill.categories.map((category) => ({
            skillId: upsertedSkill.id,
            category,
          })),
        });
      }

      if (allTags.length) {
        await tx.skillTag.createMany({
          data: allTags.map((tag) => ({
            skillId: upsertedSkill.id,
            tag,
          })),
        });
      }

      if (skill.capabilities?.length) {
        await tx.skillCapability.createMany({
          data: skill.capabilities.map((cap) => ({
            skillId: upsertedSkill.id,
            capability: cap.capability,
            inputType: cap.inputType || null,
            outputType: cap.outputType || null,
          })),
        });
      }
    });
  }
}

export interface SyncSourceResult {
  success: boolean;
  error?: string;
  errorKind?: string;
  adapter?: string;
  skillCount?: number;
}

export async function syncSource(
  sourceSlug: string,
  sourceUrl: string
): Promise<SyncSourceResult> {
  const adapter = findAdapter(sourceSlug, sourceUrl);
  if (!adapter) {
    return {
      success: false,
      errorKind: "no_adapter",
      error: `No adapter can handle source: ${sourceSlug} (${sourceUrl})`,
    };
  }

  try {
    const result = await adapter.fetch(sourceUrl, sourceSlug);
    await upsertFromResult(result);
    return { success: true, adapter: adapter.name, skillCount: result.skills.length };
  } catch (err) {
    // Optional explicit mock fallback (off by default to avoid masking failures).
    if (process.env.INGESTION_USE_MOCK === "1" && adapter.name !== "mock") {
      try {
        const mock = new MockAdapter();
        const result = await mock.fetch(sourceUrl, sourceSlug);
        await upsertFromResult(result);
        return {
          success: true,
          adapter: "mock",
          skillCount: result.skills.length,
          error: `Primary adapter (${adapter.name}) failed; mock fallback used. Original: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      } catch (mockErr) {
        return {
          success: false,
          adapter: adapter.name,
          errorKind: err instanceof GitHubFetchError ? err.kind : "unknown",
          error: `Primary (${adapter.name}): ${err instanceof Error ? err.message : String(err)}. Mock fallback also failed: ${
            mockErr instanceof Error ? mockErr.message : String(mockErr)
          }`,
        };
      }
    }

    return {
      success: false,
      adapter: adapter.name,
      errorKind: err instanceof GitHubFetchError ? err.kind : "unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface SyncAllResult {
  total: number;
  succeeded: number;
  failed: number;
  results: ({ slug: string } & SyncSourceResult)[];
}

export async function syncAllSources(): Promise<SyncAllResult> {
  const syncJob = await prisma.syncJob.create({
    data: { status: "RUNNING" },
  });

  const results: ({ slug: string } & SyncSourceResult)[] = [];

  for (const source of SOURCE_REPOSITORIES) {
    await prisma.sourceRepository.upsert({
      where: { slug: source.slug },
      update: { syncStatus: "SYNCING", syncError: null },
      create: {
        slug: source.slug,
        name: source.name,
        author: source.author,
        sourceUrl: source.sourceUrl,
        description: source.description,
        rating: source.rating,
        syncStatus: "SYNCING",
      },
    });

    const result = await syncSource(source.slug, source.sourceUrl);
    results.push({ slug: source.slug, ...result });

    if (!result.success) {
      await prisma.sourceRepository.update({
        where: { slug: source.slug },
        data: {
          syncStatus: "FAILED",
          syncError: result.errorKind
            ? `[${result.errorKind}] ${result.error || ""}`.trim()
            : result.error || "Unknown failure",
        },
      });
    }
  }

  await prisma.syncJob.update({
    where: { id: syncJob.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      details: JSON.stringify({
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        byKind: results
          .filter((r) => !r.success)
          .reduce<Record<string, number>>((acc, r) => {
            const k = r.errorKind || "unknown";
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {}),
      }),
    },
  });

  return {
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
