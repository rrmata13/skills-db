import { prisma } from "@/lib/db";
import { SourceAdapter } from "@/lib/adapters/types";
import { AgentSkillsCCAdapter } from "@/lib/adapters/agent-skills-cc";
import { MockAdapter } from "@/lib/adapters/mock-adapter";
import { SOURCE_REPOSITORIES } from "@/lib/constants";
import { SourceAdapterResult } from "@/types";

const adapters: SourceAdapter[] = [
  new AgentSkillsCCAdapter(),
  new MockAdapter(),
];

function findAdapter(sourceUrl: string): SourceAdapter {
  return adapters.find((a) => a.canHandle(sourceUrl)) || adapters[adapters.length - 1];
}

async function upsertFromResult(result: SourceAdapterResult) {
  // Upsert source repository
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

  // Upsert skills
  for (const skill of result.skills) {
    const slug = skill.slug || `${result.source.slug}-${skill.name.toLowerCase().replace(/\s+/g, "-")}`;

    const embeddingText = [
      skill.name,
      skill.description,
      ...(skill.tags || []),
      ...(skill.categories || []),
      ...(skill.capabilities?.map((c) => c.capability) || []),
    ].join(" ");

    const upsertedSkill = await prisma.skill.upsert({
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

    // Clear existing relations for this skill
    await prisma.skillCategory.deleteMany({ where: { skillId: upsertedSkill.id } });
    await prisma.skillTag.deleteMany({ where: { skillId: upsertedSkill.id } });
    await prisma.skillCapability.deleteMany({ where: { skillId: upsertedSkill.id } });

    // Insert categories
    if (skill.categories?.length) {
      await prisma.skillCategory.createMany({
        data: skill.categories.map((category) => ({
          skillId: upsertedSkill.id,
          category,
        })),
      });
    }

    // Insert tags
    const allTags = [...new Set([...(skill.tags || []), ...(skill.keywords || [])])];
    if (allTags.length) {
      await prisma.skillTag.createMany({
        data: allTags.map((tag) => ({
          skillId: upsertedSkill.id,
          tag,
        })),
      });
    }

    // Insert capabilities
    if (skill.capabilities?.length) {
      await prisma.skillCapability.createMany({
        data: skill.capabilities.map((cap) => ({
          skillId: upsertedSkill.id,
          capability: cap.capability,
          inputType: cap.inputType || null,
          outputType: cap.outputType || null,
        })),
      });
    }
  }
}

export async function syncSource(
  sourceSlug: string,
  sourceUrl: string
): Promise<{ success: boolean; error?: string }> {
  const adapter = findAdapter(sourceUrl);

  try {
    // Try primary adapter first
    const result = await adapter.fetch(sourceUrl, sourceSlug);
    await upsertFromResult(result);
    return { success: true };
  } catch (primaryError) {
    // Fall back to mock adapter
    if (adapter.name !== "mock") {
      try {
        const mockAdapter = new MockAdapter();
        const result = await mockAdapter.fetch(sourceUrl, sourceSlug);
        await upsertFromResult(result);
        return { success: true };
      } catch {
        const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
        return { success: false, error: `Primary: ${errMsg}. Fallback also failed.` };
      }
    }
    const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
    return { success: false, error: errMsg };
  }
}

export async function syncAllSources(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: { slug: string; success: boolean; error?: string }[];
}> {
  const syncJob = await prisma.syncJob.create({
    data: { status: "RUNNING" },
  });

  const results: { slug: string; success: boolean; error?: string }[] = [];

  for (const source of SOURCE_REPOSITORIES) {
    await prisma.sourceRepository.upsert({
      where: { slug: source.slug },
      update: { syncStatus: "SYNCING" },
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
        data: { syncStatus: "FAILED", syncError: result.error },
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
