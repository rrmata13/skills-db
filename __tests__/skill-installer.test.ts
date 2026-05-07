import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  isValidSlug,
  resolveTarget,
  buildSkillMd,
  installSkill,
  uninstallSkill,
  SKILLS_ROOT,
} from "@/lib/services/skill-installer";
import type { SkillWithRelations } from "@/types";

function baseSkill(overrides: Partial<SkillWithRelations> = {}): SkillWithRelations {
  return {
    id: "test-id",
    name: "Test Skill",
    slug: "test-skill",
    description: "A skill used in tests.",
    longDescription: null,
    rawContent: null,
    imageUrl: null,
    authorName: "tester",
    authorUrl: null,
    repoUrl: "https://example.com/repo",
    rating: 1,
    confidenceBase: 0.5,
    curationStatus: "unreviewed",
    notes: null,
    installedAt: null,
    installedPath: null,
    sourceRepository: {
      id: "src-id",
      name: "Test Source",
      author: "tester",
      sourceUrl: "https://example.com",
    },
    categories: [{ category: "coding" }],
    tags: [{ tag: "testing" }],
    capabilities: [{ capability: "writes tests" }],
    ...overrides,
  };
}

describe("isValidSlug", () => {
  it("accepts lowercase, digits, hyphens, and underscores", () => {
    expect(isValidSlug("my-skill")).toBe(true);
    expect(isValidSlug("my_skill_01")).toBe(true);
    expect(isValidSlug("oc-1password")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it("rejects traversal and absolute paths", () => {
    expect(isValidSlug("..")).toBe(false);
    expect(isValidSlug("../etc")).toBe(false);
    expect(isValidSlug("/etc/passwd")).toBe(false);
    expect(isValidSlug("foo/bar")).toBe(false);
  });

  it("rejects uppercase, spaces, and empty input", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Foo")).toBe(false);
    expect(isValidSlug("foo bar")).toBe(false);
    expect(isValidSlug("foo.bar")).toBe(false);
  });

  it("rejects slugs that start with hyphen", () => {
    expect(isValidSlug("-foo")).toBe(false);
  });
});

describe("resolveTarget", () => {
  it("returns a path under SKILLS_ROOT for valid slugs", () => {
    const t = resolveTarget("my-skill");
    expect(t).toBe(path.join(SKILLS_ROOT, "my-skill"));
  });

  it("returns null for invalid slugs", () => {
    expect(resolveTarget("..")).toBeNull();
    expect(resolveTarget("../etc")).toBeNull();
    expect(resolveTarget("/abs")).toBeNull();
    expect(resolveTarget("")).toBeNull();
  });
});

describe("buildSkillMd", () => {
  it("uses rawContent verbatim when it already has frontmatter", () => {
    const raw = "---\nname: existing\ndescription: from source\n---\n\n# Body\n";
    const md = buildSkillMd(baseSkill({ rawContent: raw }));
    expect(md.startsWith("---\nname: existing")).toBe(true);
    expect(md).toContain("# Body");
  });

  it("synthesizes valid frontmatter for skills without rawContent", () => {
    const md = buildSkillMd(baseSkill());
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toMatch(/^name: test-skill$/m);
    expect(md).toMatch(/^description: "A skill used in tests\."$/m);
    expect(md).toContain("# Test Skill");
    expect(md).toContain("## Capabilities");
    expect(md).toContain("- writes tests");
    expect(md).toContain("**Categories:** coding");
    expect(md).toContain("**Tags:** testing");
    expect(md).toContain("Installed by SkillMapper");
  });

  it("collapses multiline descriptions to a single line in frontmatter", () => {
    const md = buildSkillMd(
      baseSkill({ description: "line one\nline two\nline three" })
    );
    const frontmatterEnd = md.indexOf("---", 4);
    const frontmatter = md.slice(0, frontmatterEnd);
    expect(frontmatter).not.toMatch(/\n---\n.*\n.*line two/);
    expect(md).toMatch(/^description: "line one line two line three"$/m);
  });

  it("truncates descriptions longer than 1024 chars in frontmatter", () => {
    const huge = "x".repeat(2000);
    const md = buildSkillMd(baseSkill({ description: huge }));
    const descLine = md.split("\n").find((l) => l.startsWith("description:"))!;
    expect(descLine.length).toBeLessThanOrEqual(1024 + "description: \"\"".length);
  });
});

describe("installSkill / uninstallSkill", () => {
  const safeSlug = "skillmapper-test-" + Date.now();
  const collisionSlug = "skillmapper-test-collision-" + Date.now();

  afterEach(async () => {
    for (const slug of [safeSlug, collisionSlug]) {
      const p = path.join(os.homedir(), ".claude", "skills", slug);
      await fs.rm(p, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("refuses installation for invalid slugs", async () => {
    const result = await installSkill(baseSkill({ slug: "../evil" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_slug");
  });

  it("writes SKILL.md for a valid skill and records the path", async () => {
    const result = await installSkill(baseSkill({ slug: safeSlug }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const body = await fs.readFile(path.join(result.path, "SKILL.md"), "utf8");
      expect(body).toContain(`name: ${safeSlug}`);
    }
  });

  it("returns exists_outside_skillmapper when dir exists and is not ours", async () => {
    const dir = path.join(os.homedir(), ".claude", "skills", collisionSlug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "SKILL.md"), "pre-existing");

    const result = await installSkill(baseSkill({ slug: collisionSlug }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("exists_outside_skillmapper");

    // Force flag overrides
    const forced = await installSkill(baseSkill({ slug: collisionSlug }), {
      force: true,
    });
    expect(forced.ok).toBe(true);
  });

  it("allows re-install when previousInstalledPath matches target", async () => {
    const target = path.join(os.homedir(), ".claude", "skills", safeSlug);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "SKILL.md"), "old content");

    const result = await installSkill(baseSkill({ slug: safeSlug }), {
      previousInstalledPath: target,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const body = await fs.readFile(path.join(result.path, "SKILL.md"), "utf8");
      expect(body).not.toBe("old content");
    }
  });

  it("uninstall removes the dir and reports removed: true", async () => {
    const install = await installSkill(baseSkill({ slug: safeSlug }));
    expect(install.ok).toBe(true);
    if (!install.ok) return;

    const result = await uninstallSkill(install.path);
    expect(result.removed).toBe(true);
    await expect(fs.access(install.path)).rejects.toThrow();
  });

  it("uninstall refuses paths outside the skills root", async () => {
    const result = await uninstallSkill("/tmp/not-skillmapper");
    expect(result.removed).toBe(false);
  });

  it("uninstall with null path is a no-op", async () => {
    const result = await uninstallSkill(null);
    expect(result.removed).toBe(false);
  });
});
