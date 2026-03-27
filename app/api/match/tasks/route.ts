import { matchMultipleTasks } from "@/lib/services/matching";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const matchTasksSchema = z.object({
  queries: z.array(z.string().min(1).max(2000)).min(1).max(50),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    repositories: z.array(z.string()).optional(),
    minRating: z.number().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = matchTasksSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: `Invalid input: ${parsed.error.issues[0]?.message || "Bad request"}` },
        { status: 400 }
      );
    }

    const { queries, filters, limit } = parsed.data;
    const validQueries = queries
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    const { results, queryType } = await matchMultipleTasks(
      validQueries,
      filters,
      limit
    );

    return NextResponse.json({
      data: { results },
      error: null,
      meta: { queryType, total: results.length },
    });
  } catch (error) {
    console.error("[POST /api/match/tasks]", error);
    return NextResponse.json(
      { data: null, error: "Failed to match tasks" },
      { status: 500 }
    );
  }
}
