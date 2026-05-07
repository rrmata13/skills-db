/**
 * Tests for POST /api/sync/sources. We mock the underlying ingestion service
 * so the test never touches the network or DB — the goal is to verify the
 * route correctly serializes results and propagates structured errors.
 */
import { NextResponse } from "next/server";

jest.mock("@/lib/services/ingestion", () => ({
  syncAllSources: jest.fn(),
}));

import { syncAllSources } from "@/lib/services/ingestion";
import { POST as syncHandler } from "@/app/api/sync/sources/route";

const mockedSync = syncAllSources as jest.MockedFunction<typeof syncAllSources>;

async function readJson(res: Response): Promise<unknown> {
  return res.json();
}

describe("POST /api/sync/sources", () => {
  beforeEach(() => {
    mockedSync.mockReset();
  });

  it("returns the sync summary on success", async () => {
    mockedSync.mockResolvedValueOnce({
      total: 3,
      succeeded: 2,
      failed: 1,
      results: [
        { slug: "a", success: true, adapter: "github", skillCount: 5 },
        { slug: "b", success: true, adapter: "agent-skills-cc", skillCount: 1 },
        { slug: "c", success: false, errorKind: "not_found", error: "404" },
      ],
    });

    const res = await syncHandler();
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { data: { total: number; succeeded: number; failed: number } };
    expect(body.data.total).toBe(3);
    expect(body.data.succeeded).toBe(2);
    expect(body.data.failed).toBe(1);
  });

  it("returns 500 with a structured error when sync throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedSync.mockRejectedValueOnce(new Error("boom"));

    const res = await syncHandler();
    expect(res.status).toBe(500);
    const body = (await readJson(res)) as { data: null; error: { kind: string; cause: string } };
    expect(body.data).toBeNull();
    expect(body.error.kind).toBe("internal");
    expect(body.error.cause).toContain("boom");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
