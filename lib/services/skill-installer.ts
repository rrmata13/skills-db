import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { SkillWithRelations } from "@/types";

export const SKILLS_ROOT = path.join(os.homedir(), ".claude", "skills");

export type InstallError =
  | { kind: "invalid_slug"; slug: string }
  | { kind: "path_escape"; target: string }
  | { kind: "exists_outside_skillmapper"; target: string }
  | { kind: "not_found"; id: string }
  | { kind: "partial_install"; target: string; cause: string }
  | { kind: "internal"; cause: string };

export type InstallResult =
  | { ok: true; path: string; body: string; existed: boolean }
  | { ok: false; error: InstallError };

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function resolveTarget(slug: string): string | null {
  if (!isValidSlug(slug)) return null;
  const target = path.resolve(SKILLS_ROOT, slug);
  const root = path.resolve(SKILLS_ROOT);
  if (target === root) return null;
  if (!(target === path.join(root, slug) && target.startsWith(root + path.sep))) {
    return null;
  }
  return target;
}

function escapeYamlScalar(value: string): string {
  // Keep frontmatter values on a single line and safe for the simple parser.
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.replace(/"/g, '\\"');
}

export function buildSkillMd(skill: SkillWithRelations): string {
  if (skill.rawContent && skill.rawContent.trim().startsWith("---")) {
    return skill.rawContent.endsWith("\n") ? skill.rawContent : skill.rawContent + "\n";
  }

  const name = skill.slug;
  const rawDesc = (skill.description || skill.longDescription || `Skill: ${skill.name}`).trim();
  const description = escapeYamlScalar(rawDesc).slice(0, 1024);

  const categories = skill.categories.map((c) => c.category);
  const tags = skill.tags.map((t) => t.tag);
  const capabilities = skill.capabilities.map((c) => c.capability);
  const sourceUrl = skill.repoUrl || skill.sourceRepository?.sourceUrl;

  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${name}`);
  lines.push(`description: "${description}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${skill.name}`);
  lines.push("");
  lines.push(skill.longDescription?.trim() || skill.description.trim());
  lines.push("");
  if (capabilities.length) {
    lines.push("## Capabilities");
    lines.push("");
    for (const cap of capabilities) lines.push(`- ${cap}`);
    lines.push("");
  }
  if (categories.length || tags.length) {
    lines.push("## Metadata");
    lines.push("");
    if (categories.length) lines.push(`- **Categories:** ${categories.join(", ")}`);
    if (tags.length) lines.push(`- **Tags:** ${tags.join(", ")}`);
    lines.push("");
  }
  if (sourceUrl || skill.authorName) {
    lines.push("## Source");
    lines.push("");
    if (sourceUrl) lines.push(`- **URL:** ${sourceUrl}`);
    if (skill.authorName) lines.push(`- **Author:** ${skill.authorName}`);
    lines.push(
      `- **Repository:** ${skill.sourceRepository?.name ?? "unknown"} by ${skill.sourceRepository?.author ?? "unknown"}`
    );
    lines.push("");
  }
  lines.push("<!-- Installed by SkillMapper -->");
  lines.push("");
  return lines.join("\n");
}

export interface InstallOptions {
  force?: boolean;
  previousInstalledPath?: string | null;
}

export async function installSkill(
  skill: SkillWithRelations,
  options: InstallOptions = {}
): Promise<InstallResult> {
  if (!isValidSlug(skill.slug)) {
    return { ok: false, error: { kind: "invalid_slug", slug: skill.slug } };
  }
  const target = resolveTarget(skill.slug);
  if (!target) {
    return { ok: false, error: { kind: "path_escape", target: skill.slug } };
  }

  let existed = false;
  try {
    await fs.access(target);
    existed = true;
  } catch {
    existed = false;
  }

  const ownedByUs =
    options.previousInstalledPath && path.resolve(options.previousInstalledPath) === target;

  if (existed && !ownedByUs && !options.force) {
    return { ok: false, error: { kind: "exists_outside_skillmapper", target } };
  }

  const body = buildSkillMd(skill);
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, "SKILL.md"), body, "utf8");

  return { ok: true, path: target, body, existed };
}

export async function uninstallSkill(installedPath: string | null | undefined): Promise<{
  ok: true;
  removed: boolean;
}> {
  if (!installedPath) return { ok: true, removed: false };
  const resolved = path.resolve(installedPath);
  const root = path.resolve(SKILLS_ROOT);
  if (!resolved.startsWith(root + path.sep)) {
    return { ok: true, removed: false };
  }
  try {
    await fs.rm(resolved, { recursive: true, force: true });
    return { ok: true, removed: true };
  } catch {
    return { ok: true, removed: false };
  }
}
