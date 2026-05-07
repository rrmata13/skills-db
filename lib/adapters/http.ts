/**
 * Shared HTTP helper for source adapters: timeout, retry/backoff, structured
 * errors. Adapters can pass adapter-specific knobs (headers, rate-limit
 * detection, rate-limit wait calculation) without duplicating retry logic.
 */

export type FetchErrorKind =
  | "auth"
  | "rate_limit"
  | "not_found"
  | "transient"
  | "timeout"
  | "parse";

export class FetchError extends Error {
  readonly kind: FetchErrorKind;
  readonly status?: number;
  readonly url?: string;

  constructor(
    kind: FetchErrorKind,
    message: string,
    opts: { status?: number; url?: string; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "FetchError";
    this.kind = kind;
    this.status = opts.status;
    this.url = opts.url;
    if (opts.cause) (this as { cause?: unknown }).cause = opts.cause;
  }
}

export interface FetchWithRetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  /** Headers merged on top of the defaults. Last write wins. */
  headers?: Record<string, string>;
  /** Override the default User-Agent. */
  userAgent?: string;
  /**
   * Custom check: return true if a response should be treated as rate-limited
   * (even if its status isn't 429). Used by GitHub which signals rate limits
   * via 403 + `x-ratelimit-remaining: 0`.
   */
  isRateLimited?: (res: Response) => boolean;
  /**
   * Compute how many ms to wait before the next retry on a rate-limit
   * response. Defaults to exponential backoff. Cap-honored by the caller.
   */
  getRateLimitWaitMs?: (res: Response, attempt: number, baseBackoffMs: number) => number;
}

const DEFAULT_USER_AGENT = "SkillMapper/1.0";

function classifyStatus(status: number): FetchErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status >= 500 && status <= 599) return "transient";
  return "transient";
}

function buildHeaders(opts: FetchWithRetryOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": opts.userAgent || DEFAULT_USER_AGENT,
  };
  if (opts.headers) Object.assign(headers, opts.headers);
  return headers;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry on transient errors (5xx) and rate limits (429 or
 * adapter-detected). Throws FetchError on terminal failures.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { timeoutMs = 15000, maxRetries = 3, baseBackoffMs = 500 } = options;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: buildHeaders(options),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) return res;

      const isRateLimit = res.status === 429 || (options.isRateLimited?.(res) ?? false);
      if (isRateLimit) {
        if (attempt < maxRetries) {
          const waitMs =
            options.getRateLimitWaitMs?.(res, attempt, baseBackoffMs) ??
            baseBackoffMs * 2 ** attempt;
          await sleep(Math.min(waitMs, 5000));
          continue;
        }
        throw new FetchError("rate_limit", `Rate limit (status ${res.status})`, {
          status: res.status,
          url,
        });
      }

      const kind = classifyStatus(res.status);
      if (kind === "transient" && attempt < maxRetries) {
        await sleep(baseBackoffMs * 2 ** attempt);
        continue;
      }
      throw new FetchError(kind, `HTTP ${res.status} for ${url}`, {
        status: res.status,
        url,
      });
    } catch (err) {
      if (err instanceof FetchError) throw err;

      const isAbort =
        err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      const isNetwork = err instanceof TypeError;
      if ((isAbort || isNetwork) && attempt < maxRetries) {
        lastErr = err;
        await sleep(baseBackoffMs * 2 ** attempt);
        continue;
      }
      throw new FetchError(
        isAbort ? "timeout" : "transient",
        `Network error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
        { url, cause: err }
      );
    }
  }
  throw new FetchError("transient", `Exhausted retries for ${url}`, { url, cause: lastErr });
}
