/**
 * Integration tests for the curation API routes. Hits the real handlers and
 * the dev SQLite DB. Each test creates a fixture skill with a unique slug and
 * cleans up after itself, so it can run in parallel with the dev server.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

import { PATCH as patchHandler } from "@/app/api/curate/[id]/route";
import { POST as installHandler } from "@/app/api/curate/[id]/install/route";
import { POST as uninstallHandler } from "@/app/api/curate/[id]/uninstall/route";
import { GET as statsHandler } from "@/app/api/curate/stats/route";

const TEST_SOURCE_SLUG = "__sm_api_curate_test_src__";

let counter = 0;
function uniqueSlug(label: string): string {
  return `sm-apitest-${label}-${Date.now()}-${++counter}`;
}

async function makeFixtureSkill(slug: string) {
  const source = await prisma.sourceRepository.upsert({
    where: { slug: TEST_SOURCE_SLUG },
    update: {},
    create: {
      slug: TEST_SOURCE_SLUG,
      name: "API test source",
      author: "test",
      sourceUrl: `https://example.test/${TEST_SOURCE_SLUG}`,
      description: "fixture",
      rating: 0,
    },
  });
  return prisma.skill.create({
    data: {
      sourceRepositoryId: source.id,
      slug,
      name: slug,
      description: "Fixture skill for API tests.",
    },
  });
}

async function cleanupFixtureSkill(slug: string) {
  // Cascade also cleans relations.
  await prisma.skill.deleteMany({ where: { slug } });
  const installPath = path.join(os.homedir(), ".claude", "skills", slug);
  await fs.rm(installPath, { recursive: true, force: true }).catch(() => {});
}

afterAll(async () => {
  await prisma.sourceRepository.deleteMany({ where: { slug: TEST_SOURCE_SLUG } });
  await prisma.$disconnect();
});

function jsonRequest(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function emptyRequest(url: string, method: "POST" | "GET" = "POST") {
  return new NextRequest(url, { method });
}

async function readJson(res: Response): Promise<{ status: number; body: unknown }> {
  return { status: res.status, body: await res.json() };
}

describe("PATCH /api/curate/[id]", () => {
  it("returns 404 for unknown id/slug", async () => {
    const req = jsonRequest(
      "http://test/api/curate/missing-skill",
      { curationStatus: "favorited" },
      "PATCH"
    );
    const res = await patchHandler(req, {
      params: Promise.resolve({ id: "missing-skill" }),
    });
    const out = await readJson(res);
    expect(out.status).toBe(404);
  });

  it("rejects an empty patch with 400", async () => {
    const slug = uniqueSlug("patch-empty");
    await makeFixtureSkill(slug);
    try {
      const req = jsonRequest(`http://test/api/curate/${slug}`, {}, "PATCH");
      const res = await patchHandler(req, { params: Promise.resolve({ id: slug }) });
      const out = await readJson(res);
      expect(out.status).toBe(400);
    } finally {
      await cleanupFixtureSkill(slug);
    }
  });

  it("updates curationStatus and notes", async () => {
    const slug = uniqueSlug("patch-update");
    await makeFixtureSkill(slug);
    try {
      const req = jsonRequest(
        `http://test/api/curate/${slug}`,
        { curationStatus: "favorited", notes: "useful" },
        "PATCH"
      );
      const res = await patchHandler(req, { params: Promise.resolve({ id: slug }) });
      const out = await readJson(res);
      expect(out.status).toBe(200);
      expect(out.body).toMatchObject({
        data: { slug, curationStatus: "favorited", notes: "useful" },
      });
    } finally {
      await cleanupFixtureSkill(slug);
    }
  });
});

describe("POST /api/curate/[id]/install", () => {
  it("returns 404 for unknown skill", async () => {
    const req = jsonRequest("http://test/api/curate/nope/install", {});
    const res = await installHandler(req, { params: Promise.resolve({ id: "nope" }) });
    const out = await readJson(res);
    expect(out.status).toBe(404);
  });

  it("writes SKILL.md and stamps installedAt", async () => {
    const slug = uniqueSlug("install-ok");
    await makeFixtureSkill(slug);
    try {
      const req = jsonRequest(`http://test/api/curate/${slug}/install`, {});
      const res = await installHandler(req, { params: Promise.resolve({ id: slug }) });
      const out = await readJson(res);
      expect(out.status).toBe(200);
      const target = path.join(os.homedir(), ".claude", "skills", slug);
      const written = await fs.readFile(path.join(target, "SKILL.md"), "utf8");
      expect(written).toContain(`name: ${slug}`);

      const inDb = await prisma.skill.findUnique({ where: { slug } });
      expect(inDb?.installedAt).not.toBeNull();
      expect(inDb?.installedPath).toBe(target);
    } finally {
      await cleanupFixtureSkill(slug);
    }
  });

  it("returns 409 when target dir exists outside SkillMapper", async () => {
    const slug = uniqueSlug("install-collision");
    await makeFixtureSkill(slug);
    const target = path.join(os.homedir(), ".claude", "skills", slug);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "SKILL.md"), "pre-existing");
    try {
      const req = jsonRequest(`http://test/api/curate/${slug}/install`, {});
      const res = await installHandler(req, { params: Promise.resolve({ id: slug }) });
      const out = await readJson(res);
      expect(out.status).toBe(409);
      expect(out.body).toMatchObject({
        error: { kind: "exists_outside_skillmapper" },
      });
    } finally {
      await cleanupFixtureSkill(slug);
    }
  });

  it("force=true overrides the collision and installs", async () => {
    const slug = uniqueSlug("install-force");
    await makeFixtureSkill(slug);
    const target = path.join(os.homedir(), ".claude", "skills", slug);
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(path.join(target, "SKILL.md"), "pre-existing");
    try {
      const req = jsonRequest(`http://test/api/curate/${slug}/install`, { force: true });
      const res = await installHandler(req, { params: Promise.resolve({ id: slug }) });
      expect(res.status).toBe(200);
      const written = await fs.readFile(path.join(target, "SKILL.md"), "utf8");
      expect(written).not.toBe("pre-existing");
    } finally {
      await cleanupFixtureSkill(slug);
    }
  });
});

describe("POST /api/curate/[id]/uninstall", () => {
  it("returns 404 for unknown skill", async () => {
    const req = emptyRequest("http://test/api/curate/nope/uninstall");
    const res = await uninstallHandler(req, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });

  it("clears installedAt/installedPath and removes the dir", async () => {
    const slug = uniqueSlug("uninstall-ok");
    await makeFixtureSkill(slug);
    try {
      // First install
      const installReq = jsonRequest(`http://test/api/curate/${slug}/install`, {});
      const installRes = await installHandler(installReq, {
        params: Promise.resolve({ id: slug }),
      });
      expect(installRes.status).toBe(200);

      // Then uninstall
      const req = emptyRequest(`http://test/api/curate/${slug}/uninstall`);
      const res = await uninstallHandler(req, { params: Promise.resolve({ id: slug }) });
      expect(res.status).toBe(200);

      const inDb = await prisma.skill.findUnique({ where: { slug } });
      expect(inDb?.installedAt).toBeNull();
      expect(inDb?.installedPath).toBeNull();

      const target = path.join(os.homedir(), ".claude", "skills", slug);
      await expect(fs.access(target)).rejects.toThrow();
    } finally {
      await cleanupFixtureSkill(slug);
    }
  });
});

describe("GET /api/curate/stats", () => {
  it("returns counts by status with installed total", async () => {
    const res = await statsHandler();
    const out = await readJson(res);
    expect(out.status).toBe(200);
    const body = out.body as { data: { total: number; unreviewed: number; favorited: number; hidden: number; installed: number } };
    expect(body.data).toHaveProperty("total");
    expect(body.data).toHaveProperty("unreviewed");
    expect(body.data).toHaveProperty("favorited");
    expect(body.data).toHaveProperty("hidden");
    expect(body.data).toHaveProperty("installed");
    expect(body.data.total).toBeGreaterThanOrEqual(
      body.data.unreviewed + body.data.favorited + body.data.hidden
    );
  });
});
