import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { installSkill, uninstallSkill, type InstallError } from "@/lib/services/skill-installer";
import type { SkillWithRelations } from "@/types";

export interface InstallAndPersistOptions {
  force?: boolean;
  /** Override the prisma client — used by tests to inject a failing client. */
  db?: PrismaClient;
}

export type InstallAndPersistResult =
  | {
      ok: true;
      path: string;
      body: string;
      existed: boolean;
      installedAt: Date;
    }
  | {
      ok: false;
      error: InstallError;
    };

/**
 * Look up a skill by id-or-slug, write its SKILL.md, and atomically record the
 * installation in the DB. If the DB update fails after the file is written,
 * the file is rolled back so the DB and filesystem stay consistent.
 */
export async function installSkillWithPersistence(
  idOrSlug: string,
  options: InstallAndPersistOptions = {}
): Promise<InstallAndPersistResult> {
  const db = options.db ?? defaultPrisma;

  const skill = await db.skill.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      sourceRepository: {
        select: { id: true, name: true, author: true, sourceUrl: true },
      },
      categories: { select: { category: true } },
      tags: { select: { tag: true } },
      capabilities: {
        select: { capability: true, inputType: true, outputType: true },
      },
    },
  });

  if (!skill) {
    return { ok: false, error: { kind: "not_found", id: idOrSlug } };
  }

  const installResult = await installSkill(skill as unknown as SkillWithRelations, {
    force: options.force,
    previousInstalledPath: skill.installedPath,
  });

  if (!installResult.ok) {
    return { ok: false, error: installResult.error };
  }

  // File is now on disk. Persist to DB. If THIS step fails, roll back the file
  // so we never leave the DB and filesystem out of sync.
  try {
    const installedAt = new Date();
    await db.skill.update({
      where: { id: skill.id },
      data: { installedAt, installedPath: installResult.path },
    });
    return {
      ok: true,
      path: installResult.path,
      body: installResult.body,
      existed: installResult.existed,
      installedAt,
    };
  } catch (dbErr) {
    // Best-effort rollback: try to remove the just-written dir. If the user
    // had pre-existing content there (force-install over collision), this
    // still removes it — that's the correct behavior since the install never
    // committed in the DB.
    await uninstallSkill(installResult.path).catch(() => {
      /* swallow; we're already in an error path */
    });
    return {
      ok: false,
      error: {
        kind: "partial_install",
        target: installResult.path,
        cause: dbErr instanceof Error ? dbErr.message : String(dbErr),
      },
    };
  }
}

export interface UninstallAndPersistResult {
  ok: true;
  removed: boolean;
  installedAt: null;
  installedPath: null;
}

export async function uninstallSkillWithPersistence(
  idOrSlug: string,
  options: { db?: PrismaClient } = {}
): Promise<UninstallAndPersistResult | { ok: false; error: InstallError }> {
  const db = options.db ?? defaultPrisma;
  const skill = await db.skill.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, installedPath: true },
  });

  if (!skill) {
    return { ok: false, error: { kind: "not_found", id: idOrSlug } };
  }

  const removeResult = await uninstallSkill(skill.installedPath);
  await db.skill.update({
    where: { id: skill.id },
    data: { installedAt: null, installedPath: null },
  });

  return {
    ok: true,
    removed: removeResult.removed,
    installedAt: null,
    installedPath: null,
  };
}
