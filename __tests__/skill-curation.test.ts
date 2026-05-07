import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { PrismaClient } from "@prisma/client";
import { installSkillWithPersistence, uninstallSkillWithPersistence } from "@/lib/services/skill-curation";

const SLUG = "skillmapper-curation-test-" + Date.now();

function fakeSkill(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-skill-id",
    slug: SLUG,
    name: "Test Skill",
    description: "Used by skill-curation tests.",
    longDescription: null,
    rawContent: null,
    imageUrl: null,
    authorName: null,
    authorUrl: null,
    repoUrl: null,
    rating: 0,
    confidenceBase: 0.5,
    curationStatus: "unreviewed",
    notes: null,
    installedAt: null,
    installedPath: null,
    sourceRepository: { id: "src-id", name: "src", author: "test", sourceUrl: "https://x" },
    categories: [],
    tags: [],
    capabilities: [],
    ...overrides,
  };
}

function makeFakeDb(opts: {
  findResult?: ReturnType<typeof fakeSkill> | null;
  updateImpl?: () => Promise<unknown>;
}): PrismaClient {
  return {
    skill: {
      findFirst: async () => opts.findResult ?? null,
      update: opts.updateImpl ?? (async () => ({})),
    },
  } as unknown as PrismaClient;
}

async function cleanupSlug(slug: string): Promise<void> {
  const target = path.join(os.homedir(), ".claude", "skills", slug);
  await fs.rm(target, { recursive: true, force: true }).catch(() => {});
}

afterEach(() => cleanupSlug(SLUG));

describe("installSkillWithPersistence", () => {
  it("returns not_found when skill is missing", async () => {
    const db = makeFakeDb({ findResult: null });
    const result = await installSkillWithPersistence("missing", { db });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });

  it("writes file and persists DB row on success", async () => {
    let updateCalled = false;
    let updateArgs: { where: unknown; data: { installedPath?: string } } | undefined;
    const db = makeFakeDb({
      findResult: fakeSkill(),
      updateImpl: async (...args: unknown[]) => {
        updateCalled = true;
        updateArgs = args[0] as typeof updateArgs;
        return {};
      },
    });

    const result = await installSkillWithPersistence(SLUG, { db });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(updateCalled).toBe(true);
    expect(updateArgs?.data.installedPath).toBe(result.path);

    const onDisk = await fs.readFile(path.join(result.path, "SKILL.md"), "utf8");
    expect(onDisk).toContain(`name: ${SLUG}`);
  });

  it("rolls back the file write when DB update throws (partial_install)", async () => {
    const db = makeFakeDb({
      findResult: fakeSkill(),
      updateImpl: async () => {
        throw new Error("simulated DB failure");
      },
    });

    const result = await installSkillWithPersistence(SLUG, { db });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("partial_install");
    if (result.error.kind === "partial_install") {
      expect(result.error.cause).toContain("simulated DB failure");
      // The just-written dir should have been removed.
      await expect(fs.access(result.error.target)).rejects.toThrow();
    }
  });

  it("returns invalid_slug without touching the DB when slug is unsafe", async () => {
    let updateCalled = false;
    const db = makeFakeDb({
      findResult: fakeSkill({ slug: "../etc/passwd" }),
      updateImpl: async () => {
        updateCalled = true;
        return {};
      },
    });

    const result = await installSkillWithPersistence("anything", { db });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_slug");
    expect(updateCalled).toBe(false);
  });
});

describe("uninstallSkillWithPersistence", () => {
  it("returns not_found when skill is missing", async () => {
    const db = makeFakeDb({ findResult: null });
    const result = await uninstallSkillWithPersistence("missing", { db });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("not_found");
  });

  it("clears DB fields and removes the dir for an installed skill", async () => {
    // First create a real installed dir
    const installPath = path.join(os.homedir(), ".claude", "skills", SLUG);
    await fs.mkdir(installPath, { recursive: true });
    await fs.writeFile(path.join(installPath, "SKILL.md"), "stub");

    let updatedTo: { installedAt: unknown; installedPath: unknown } | undefined;
    const db = makeFakeDb({
      findResult: fakeSkill({ installedPath: installPath }),
      updateImpl: async (...args: unknown[]) => {
        const a = args[0] as { data: typeof updatedTo };
        updatedTo = a.data;
        return {};
      },
    });

    const result = await uninstallSkillWithPersistence(SLUG, { db });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.removed).toBe(true);
    expect(updatedTo?.installedAt).toBeNull();
    expect(updatedTo?.installedPath).toBeNull();
    await expect(fs.access(installPath)).rejects.toThrow();
  });
});
