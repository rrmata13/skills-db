import { fetchWithRetry, FetchError } from "@/lib/adapters/http";

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

describe("fetchWithRetry (shared)", () => {
  it("uses default User-Agent when none specified", async () => {
    let observed: Headers | undefined;
    await withFetch(
      async (_url, init) => {
        observed = new Headers(init?.headers);
        return jsonResponse({});
      },
      () => fetchWithRetry("https://x")
    );
    expect(observed?.get("user-agent")).toBe("SkillMapper/1.0");
  });

  it("honors custom userAgent option", async () => {
    let observed: Headers | undefined;
    await withFetch(
      async (_url, init) => {
        observed = new Headers(init?.headers);
        return jsonResponse({});
      },
      () => fetchWithRetry("https://x", { userAgent: "TestAgent/2.0" })
    );
    expect(observed?.get("user-agent")).toBe("TestAgent/2.0");
  });

  it("merges custom headers without dropping User-Agent", async () => {
    let observed: Headers | undefined;
    await withFetch(
      async (_url, init) => {
        observed = new Headers(init?.headers);
        return jsonResponse({});
      },
      () =>
        fetchWithRetry("https://x", {
          headers: { Authorization: "Bearer abc", Accept: "application/json" },
        })
    );
    expect(observed?.get("authorization")).toBe("Bearer abc");
    expect(observed?.get("accept")).toBe("application/json");
    expect(observed?.get("user-agent")).toBe("SkillMapper/1.0");
  });

  it("invokes custom isRateLimited callback to detect non-429 rate limits", async () => {
    let calls = 0;
    const result = await withFetch(
      async () => {
        calls++;
        if (calls === 1) {
          return new Response("limited", {
            status: 418, // unrelated to default rate-limit detection
            headers: { "x-custom-rate": "1" },
          });
        }
        return jsonResponse({});
      },
      () =>
        fetchWithRetry("https://x", {
          baseBackoffMs: 1,
          maxRetries: 2,
          isRateLimited: (res) => res.headers.get("x-custom-rate") === "1",
        })
    );
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("uses getRateLimitWaitMs to compute the backoff between retries", async () => {
    let calls = 0;
    let observedAttempt: number | undefined;
    await withFetch(
      async () => {
        calls++;
        if (calls === 1) {
          return new Response("rate", { status: 429 });
        }
        return jsonResponse({});
      },
      () =>
        fetchWithRetry("https://x", {
          baseBackoffMs: 1,
          maxRetries: 2,
          getRateLimitWaitMs: (_res, attempt) => {
            observedAttempt = attempt;
            return 1; // fast retry
          },
        })
    );
    expect(observedAttempt).toBe(0); // first retry attempt is index 0
    expect(calls).toBe(2);
  });

  it("classifies 401 as auth and stops retrying", async () => {
    let calls = 0;
    await expect(
      withFetch(
        async () => {
          calls++;
          return new Response("unauth", { status: 401 });
        },
        () => fetchWithRetry("https://x", { baseBackoffMs: 1, maxRetries: 3 })
      )
    ).rejects.toBeInstanceOf(FetchError);
    expect(calls).toBe(1);
  });

  it("retries 503 transient up to maxRetries then throws", async () => {
    let calls = 0;
    await expect(
      withFetch(
        async () => {
          calls++;
          return new Response("down", { status: 503 });
        },
        () => fetchWithRetry("https://x", { baseBackoffMs: 1, maxRetries: 2 })
      )
    ).rejects.toMatchObject({ kind: "transient", status: 503 });
    expect(calls).toBe(3); // initial + 2 retries
  });
});
