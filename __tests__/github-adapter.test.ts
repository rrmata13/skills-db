import {
  fetchWithRetry,
  GitHubAdapter,
  GitHubFetchError,
} from "@/lib/adapters/github-adapter";

type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>;

function withFetch<T>(handler: FetchHandler, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) =>
    handler(typeof url === "string" ? url : url.toString(), init)) as typeof globalThis.fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("fetchWithRetry", () => {
  const originalToken = process.env.GITHUB_TOKEN;
  afterEach(() => {
    process.env.GITHUB_TOKEN = originalToken;
  });

  it("adds Authorization header when GITHUB_TOKEN is set", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_xyz";
    let observed: Headers | undefined;
    await withFetch(
      async (_url, init) => {
        observed = new Headers(init?.headers);
        return jsonResponse({ ok: true });
      },
      () => fetchWithRetry("https://api.github.com/test")
    );
    expect(observed?.get("authorization")).toBe("Bearer ghp_test_xyz");
    expect(observed?.get("user-agent")).toBe("SkillMapper/1.0");
  });

  it("omits Authorization header when GITHUB_TOKEN is unset", async () => {
    delete process.env.GITHUB_TOKEN;
    let observed: Headers | undefined;
    await withFetch(
      async (_url, init) => {
        observed = new Headers(init?.headers);
        return jsonResponse({ ok: true });
      },
      () => fetchWithRetry("https://api.github.com/test")
    );
    expect(observed?.get("authorization")).toBeNull();
  });

  it("retries on 500 then succeeds", async () => {
    let calls = 0;
    const result = await withFetch(
      async () => {
        calls++;
        if (calls < 3) return new Response("server error", { status: 500 });
        return jsonResponse({ ok: true });
      },
      () => fetchWithRetry("https://api.github.com/test", { baseBackoffMs: 1, maxRetries: 3 })
    );
    expect(calls).toBe(3);
    expect(result.ok).toBe(true);
  });

  it("throws GitHubFetchError(auth) on 401 without retry", async () => {
    let calls = 0;
    await expect(
      withFetch(
        async () => {
          calls++;
          return new Response("unauthorized", { status: 401 });
        },
        () => fetchWithRetry("https://api.github.com/test", { baseBackoffMs: 1, maxRetries: 3 })
      )
    ).rejects.toMatchObject({ kind: "auth", status: 401 });
    expect(calls).toBe(1);
  });

  it("throws GitHubFetchError(not_found) on 404 without retry", async () => {
    let calls = 0;
    await expect(
      withFetch(
        async () => {
          calls++;
          return new Response("nf", { status: 404 });
        },
        () => fetchWithRetry("https://x", { baseBackoffMs: 1, maxRetries: 3 })
      )
    ).rejects.toMatchObject({ kind: "not_found", status: 404 });
    expect(calls).toBe(1);
  });

  it("treats 403 with x-ratelimit-remaining=0 as rate_limit and retries", async () => {
    let calls = 0;
    const result = await withFetch(
      async () => {
        calls++;
        if (calls === 1) {
          return new Response("rate limited", {
            status: 403,
            headers: { "x-ratelimit-remaining": "0" },
          });
        }
        return jsonResponse({ ok: true });
      },
      () => fetchWithRetry("https://api.github.com/test", { baseBackoffMs: 1, maxRetries: 2 })
    );
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("throws GitHubFetchError(rate_limit) on 429 after retries exhausted", async () => {
    let calls = 0;
    await expect(
      withFetch(
        async () => {
          calls++;
          return new Response("rate limit", { status: 429 });
        },
        () => fetchWithRetry("https://x", { baseBackoffMs: 1, maxRetries: 1 })
      )
    ).rejects.toMatchObject({ kind: "rate_limit" });
    expect(calls).toBe(2); // initial + 1 retry
  });

  it("retries on network errors then succeeds", async () => {
    let calls = 0;
    const result = await withFetch(
      async () => {
        calls++;
        if (calls < 2) throw new TypeError("fetch failed");
        return jsonResponse({ ok: true });
      },
      () => fetchWithRetry("https://x", { baseBackoffMs: 1, maxRetries: 2 })
    );
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
  });
});

describe("GitHubAdapter.fetch", () => {
  const originalToken = process.env.GITHUB_TOKEN;
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "ghp_test";
  });
  afterEach(() => {
    process.env.GITHUB_TOKEN = originalToken;
  });

  it("throws no_mapping for unknown slug", async () => {
    const adapter = new GitHubAdapter();
    await expect(
      adapter.fetch("https://example.com", "totally-unknown-source")
    ).rejects.toMatchObject({ kind: "no_mapping" });
  });

  it("returns parsed skills for a mapped repo", async () => {
    const adapter = new GitHubAdapter();
    const skillContent = `---
name: my-skill
description: Does a thing.
---

# My Skill

Body text here.`;

    const result = await withFetch(async (url) => {
      if (url.includes("/git/trees/")) {
        return jsonResponse({
          tree: [
            { path: "skills/my-skill/SKILL.md", type: "blob", sha: "a" },
            { path: "node_modules/foo/SKILL.md", type: "blob", sha: "b" },
            { path: "skills/template/SKILL.md", type: "blob", sha: "c" },
            { path: "README.md", type: "blob", sha: "d" },
          ],
        });
      }
      if (url.startsWith("https://raw.githubusercontent.com/")) {
        return new Response(skillContent, { status: 200 });
      }
      if (url.includes("/repos/anthropics/skills") && !url.includes("/git/")) {
        return jsonResponse({ description: "Anthropic skills", stargazers_count: 56673 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    }, () => adapter.fetch("https://github.com/anthropics/skills", "anthropics-skills"));

    expect(result.source.name).toBe("skills");
    expect(result.source.author).toBe("anthropics");
    expect(result.source.rating).toBe(56673);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe("my-skill");
    expect(result.skills[0].rawContent).toBe(skillContent);
  });

  it("propagates auth errors instead of swallowing them", async () => {
    const adapter = new GitHubAdapter();
    await expect(
      withFetch(
        async () => new Response("unauthorized", { status: 401 }),
        () => adapter.fetch("https://github.com/anthropics/skills", "anthropics-skills")
      )
    ).rejects.toMatchObject({ kind: "auth" });
  });

  it("aborts the whole sync if a per-file fetch hits auth/rate limits", async () => {
    const adapter = new GitHubAdapter();
    let fileCalls = 0;
    await expect(
      withFetch(
        async (url) => {
          if (url.includes("/git/trees/")) {
            return jsonResponse({
              tree: [
                { path: "skills/a/SKILL.md", type: "blob", sha: "1" },
                { path: "skills/b/SKILL.md", type: "blob", sha: "2" },
                { path: "skills/c/SKILL.md", type: "blob", sha: "3" },
              ],
            });
          }
          if (url.startsWith("https://raw.githubusercontent.com/")) {
            fileCalls++;
            return new Response("rate limit", { status: 429 });
          }
          return jsonResponse({});
        },
        () => adapter.fetch("https://github.com/anthropics/skills", "anthropics-skills")
      )
    ).rejects.toMatchObject({ kind: "rate_limit" });
    // It should bail on the first per-file rate-limit, not push through all 3.
    expect(fileCalls).toBeLessThan(3 * 3); // initial+retries per file < worst-case
  });
});
