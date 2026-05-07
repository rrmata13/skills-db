import { SourceAdapter } from "./types";
import { RawSkillData, SourceAdapterResult } from "@/types";
import {
  fetchWithRetry as sharedFetchWithRetry,
  FetchError,
  type FetchErrorKind,
  type FetchWithRetryOptions,
} from "./http";

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
  "astrbotdevs-astrbot": { owner: "AstrBotDevs", repo: "AstrBot", branch: "master" },
};

// Back-compat: prior code (and its tests) imported these from this module. The
// canonical retry implementation now lives in lib/adapters/http.ts and throws
// FetchError for the standard kinds. GitHubFetchError is a sibling type that
// adds a single GitHub-specific kind, `no_mapping`, used when a source slug
// has no entry in REPO_MAP. Catch sites should use `instanceof FetchError` for
// HTTP-layer failures and check kind === "no_mapping" separately.
export type GitHubFetchErrorKind = FetchErrorKind | "no_mapping";

export class GitHubFetchError extends Error {
  readonly kind: GitHubFetchErrorKind;
  readonly status?: number;
  readonly url?: string;

  constructor(
    kind: GitHubFetchErrorKind,
    message: string,
    opts: { status?: number; url?: string; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "GitHubFetchError";
    this.kind = kind;
    this.status = opts.status;
    this.url = opts.url;
    if (opts.cause) (this as { cause?: unknown }).cause = opts.cause;
  }
}

/**
 * Wrap the shared fetchWithRetry with GitHub-specific quirks: auth header from
 * GITHUB_TOKEN, and 403+`x-ratelimit-remaining: 0` interpreted as rate-limited.
 */
export function fetchWithRetry(
  url: string,
  options: Pick<FetchWithRetryOptions, "timeoutMs" | "maxRetries" | "baseBackoffMs"> = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return sharedFetchWithRetry(url, {
    ...options,
    headers,
    isRateLimited: (res) =>
      res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0",
    getRateLimitWaitMs: (res, attempt, baseBackoffMs) => {
      const reset = res.headers.get("x-ratelimit-reset");
      if (reset) return Math.max(0, Number(reset) * 1000 - Date.now());
      return baseBackoffMs * 2 ** attempt;
    },
  });
}

export class GitHubAdapter implements SourceAdapter {
  readonly name = "github";

  canHandle(sourceUrl: string): boolean {
    return sourceUrl.includes("github.com") || Object.keys(REPO_MAP).some((k) => sourceUrl.includes(k));
  }

  async fetch(sourceUrl: string, sourceSlug: string): Promise<SourceAdapterResult> {
    const repoInfo = REPO_MAP[sourceSlug];
    if (!repoInfo) {
      throw new GitHubFetchError("no_mapping", `No GitHub mapping for source slug: ${sourceSlug}`);
    }

    const { owner, repo, branch } = repoInfo;
    const githubUrl = `https://github.com/${owner}/${repo}`;

    // Fetch repo tree
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeRes = await fetchWithRetry(treeUrl);
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
    const fetchErrors: { path: string; kind: GitHubFetchErrorKind; message: string }[] = [];

    // Fetch each SKILL.md (limit to 60 to avoid burning the rate budget on a single repo)
    for (const path of skillPaths.slice(0, 60)) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      try {
        const res = await fetchWithRetry(rawUrl, { timeoutMs: 10000, maxRetries: 2 });
        const content = await res.text();
        const parsed = parseSkillMd(content, path, sourceSlug);
        if (parsed) skills.push(parsed);
        else fetchErrors.push({ path, kind: "parse", message: "Could not parse SKILL.md" });
      } catch (err) {
        if (err instanceof FetchError) {
          fetchErrors.push({ path, kind: err.kind, message: err.message });
          // If we hit auth/rate limits on a per-file fetch, abort the whole sync — repeated
          // failures will only burn quota.
          if (err.kind === "auth" || err.kind === "rate_limit") throw err;
        } else {
          fetchErrors.push({
            path,
            kind: "transient",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Fetch repo metadata (description + stars)
    let repoDescription = "";
    let repoStars = 0;
    try {
      const repoRes = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}`, {
        timeoutMs: 10000,
        maxRetries: 2,
      });
      const repoData = await repoRes.json();
      repoDescription = repoData.description || "";
      repoStars = repoData.stargazers_count || 0;
    } catch (err) {
      // Repo metadata is optional; log via thrown info but don't abort.
      if (err instanceof FetchError && (err.kind === "auth" || err.kind === "rate_limit")) {
        throw err;
      }
    }

    if (skills.length === 0 && skillPaths.length > 0) {
      throw new GitHubFetchError(
        "transient",
        `Found ${skillPaths.length} SKILL.md paths but parsed 0. Failures: ${JSON.stringify(
          fetchErrors.slice(0, 5)
        )}`
      );
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
