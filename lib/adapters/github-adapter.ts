import { SourceAdapter } from "./types";
import { RawSkillData, SourceAdapterResult } from "@/types";

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

const REPO_MAP: Record<string, { owner: string; repo: string; branch: string }> = {
  "anthropics-skills": { owner: "anthropics", repo: "skills", branch: "main" },
  "openclaw-openclaw": { owner: "openclaw", repo: "openclaw", branch: "main" },
  "composiohq-awesome-claude-skills": { owner: "ComposioHQ", repo: "awesome-claude-skills", branch: "master" },
  "kepano-obsidian-skills": { owner: "kepano", repo: "obsidian-skills", branch: "main" },
  "cloudflare-moltworker": { owner: "cloudflare", repo: "moltworker", branch: "main" },
  "voltagent-awesome-openclaw-skills": { owner: "VoltAgent", repo: "awesome-openclaw-skills", branch: "main" },
  "astrbotdevs-astrbot": { owner: "AstrBotDevs", repo: "AstrBot", branch: "main" },
};

export class GitHubAdapter implements SourceAdapter {
  readonly name = "github";

  canHandle(sourceUrl: string): boolean {
    return sourceUrl.includes("github.com") || Object.keys(REPO_MAP).some(k => sourceUrl.includes(k));
  }

  async fetch(sourceUrl: string, sourceSlug: string): Promise<SourceAdapterResult> {
    const repoInfo = REPO_MAP[sourceSlug];
    if (!repoInfo) {
      throw new Error(`No GitHub mapping for: ${sourceSlug}`);
    }

    const { owner, repo, branch } = repoInfo;
    const githubUrl = `https://github.com/${owner}/${repo}`;

    // Fetch repo tree
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeRes = await fetch(treeUrl, {
      headers: { "User-Agent": "SkillMapper/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!treeRes.ok) {
      throw new Error(`GitHub API error: ${treeRes.status}`);
    }

    const treeData = await treeRes.json();
    const tree: GitHubTreeItem[] = treeData.tree || [];

    // Find SKILL.md files
    const skillPaths = tree
      .filter(
        (item) =>
          item.type === "blob" &&
          item.path.endsWith("SKILL.md") &&
          !item.path.includes("node_modules") &&
          !item.path.includes("template")
      )
      .map((item) => item.path);

    const skills: RawSkillData[] = [];

    // Fetch each SKILL.md (limit to 60 to avoid rate limiting)
    for (const path of skillPaths.slice(0, 60)) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        const res = await fetch(rawUrl, {
          headers: { "User-Agent": "SkillMapper/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;

        const content = await res.text();
        const parsed = parseSkillMd(content, path, sourceSlug);
        if (parsed) {
          skills.push(parsed);
        }
      } catch {
        // Skip failed fetches
      }
    }

    // Fetch repo info for metadata
    let repoDescription = "";
    let repoStars = 0;
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { "User-Agent": "SkillMapper/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        repoDescription = repoData.description || "";
        repoStars = repoData.stargazers_count || 0;
      }
    } catch {
      // Use defaults
    }

    return {
      source: {
        slug: sourceSlug,
        name: repo,
        author: owner,
        sourceUrl,
        githubUrl,
        description: repoDescription,
        rating: repoStars,
      },
      skills,
    };
  }
}

function parseSkillMd(content: string, path: string, sourceSlug: string): RawSkillData | null {
  // Parse YAML frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  let name = "";
  let description = "";
  const tags: string[] = [];

  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    if (nameMatch) name = nameMatch[1].trim().replace(/^["']|["']$/g, "");
    if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  // Fallback: extract from path
  if (!name) {
    const parts = path.split("/");
    const dir = parts[parts.length - 2] || parts[parts.length - 1];
    name = dir.replace("SKILL.md", "").replace(/-/g, " ").trim();
    if (!name) return null;
  }

  if (!description) {
    // Try to get first paragraph after frontmatter
    const body = fmMatch ? content.slice(fmMatch[0].length) : content;
    const firstPara = body.split("\n\n").find((p) => p.trim() && !p.startsWith("#"));
    if (firstPara) {
      description = firstPara.trim().slice(0, 300);
    }
  }

  if (!description) description = `Skill: ${name}`;

  // Extract category from path
  const categories: string[] = [];
  const pathLower = path.toLowerCase();
  if (pathLower.includes("skills/")) categories.push("coding");

  // Derive slug
  const slug = `${sourceSlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;

  return {
    name,
    slug,
    description,
    longDescription: content.length > 500 ? content.slice(0, 2000) : undefined,
    rawContent: content,
    categories,
    tags,
    capabilities: [],
    authorName: sourceSlug.split("-")[0],
  };
}
