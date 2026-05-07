import { prisma } from "@/lib/db";
import { upsertFromResult } from "@/lib/services/ingestion";
import type { SourceAdapterResult } from "@/types";

const TEST_SOURCE_SLUG = "__skillmapper_test_concurrent_sync__";
const TEST_SKILL_SLUGS = ["__sm_test_a__", "__sm_test_b__"];

function makeResult(label: string): SourceAdapterResult {
  return {
    source: {
      slug: TEST_SOURCE_SLUG,
      name: "Concurrent sync test",
      author: "test",
      sourceUrl: `https://example.test/${label}`,
      githubUrl: undefined,
      description: `Test source for label=${label}`,
      rating: 0,
    },
    skills: [
      {
        name: "Skill A",
        slug: TEST_SKILL_SLUGS[0],
        description: `Skill A from ${label}`,
        categories: ["coding", "devops"],
        tags: ["alpha", "beta"],
        capabilities: [{ capability: "do something" }],
      },
      {
        name: "Skill B",
        slug: TEST_SKILL_SLUGS[1],
        description: `Skill B from ${label}`,
        categories: ["chatbot"],
        tags: ["gamma"],
        capabilities: [{ capability: "do another thing" }],
      },
    ],
  };
}

async function cleanup(): Promise<void> {
  // Skill rows cascade-delete relations; deleting source cascades to skills.
  await prisma.skill.deleteMany({ where: { slug: { in: TEST_SKILL_SLUGS } } });
  await prisma.sourceRepository.deleteMany({ where: { slug: TEST_SOURCE_SLUG } });
}

describe("upsertFromResult — concurrent safety", () => {
  beforeEach(cleanup);
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("inserts skills with correct relation counts on a single call", async () => {
    await upsertFromResult(makeResult("first"));

    const skillA = await prisma.skill.findUnique({
      where: { slug: TEST_SKILL_SLUGS[0] },
      include: { categories: true, tags: true, capabilities: true },
    });
    expect(skillA).not.toBeNull();
    expect(skillA!.categories).toHaveLength(2);
    expect(skillA!.tags).toHaveLength(2);
    expect(skillA!.capabilities).toHaveLength(1);

    const skillB = await prisma.skill.findUnique({
      where: { slug: TEST_SKILL_SLUGS[1] },
      include: { categories: true, tags: true, capabilities: true },
    });
    expect(skillB!.categories).toHaveLength(1);
    expect(skillB!.tags).toHaveLength(1);
  });

  it("does not duplicate or orphan relations under concurrent upserts of the same source", async () => {
    // Fire two parallel upserts. Without per-skill transactions, the
    // delete+create of categories/tags would race and leave duplicates or
    // orphans.
    await Promise.all([
      upsertFromResult(makeResult("parallel-A")),
      upsertFromResult(makeResult("parallel-B")),
    ]);

    const skillA = await prisma.skill.findUnique({
      where: { slug: TEST_SKILL_SLUGS[0] },
      include: { categories: true, tags: true, capabilities: true },
    });
    expect(skillA).not.toBeNull();
    // The expected category set is exactly ["coding", "devops"] — same on
    // every call. We tolerate that the LAST writer wins, but never duplication.
    expect(skillA!.categories.map((c) => c.category).sort()).toEqual(["coding", "devops"]);
    expect(skillA!.tags.map((t) => t.tag).sort()).toEqual(["alpha", "beta"]);
    expect(skillA!.capabilities).toHaveLength(1);

    const skillB = await prisma.skill.findUnique({
      where: { slug: TEST_SKILL_SLUGS[1] },
      include: { categories: true, tags: true, capabilities: true },
    });
    expect(skillB!.categories.map((c) => c.category).sort()).toEqual(["chatbot"]);
    expect(skillB!.tags.map((t) => t.tag).sort()).toEqual(["gamma"]);

    // Sanity: no orphan relations belonging to skills we never created
    const orphanCats = await prisma.skillCategory.count({
      where: {
        skill: { slug: { in: TEST_SKILL_SLUGS } },
        NOT: { category: { in: ["coding", "devops", "chatbot"] } },
      },
    });
    expect(orphanCats).toBe(0);
  });

  it("re-runs are idempotent — same input produces same row counts", async () => {
    await upsertFromResult(makeResult("first"));
    await upsertFromResult(makeResult("first"));
    await upsertFromResult(makeResult("first"));

    const skillA = await prisma.skill.findUnique({
      where: { slug: TEST_SKILL_SLUGS[0] },
      include: { categories: true, tags: true, capabilities: true },
    });
    expect(skillA!.categories).toHaveLength(2);
    expect(skillA!.tags).toHaveLength(2);
    expect(skillA!.capabilities).toHaveLength(1);
  });
});
