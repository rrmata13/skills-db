import { matchSingleTask } from "@/lib/services/matching";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const matchTaskSchema = z.object({
  query: z.string().min(1).max(2000),
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
    const parsed = matchTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: `Invalid input: ${parsed.error.issues[0]?.message || "Bad request"}` },
        { status: 400 }
      );
    }

    const { query, filters, limit } = parsed.data;
    const { results, queryType, dogfoodQueryId } = await matchSingleTask(
      query.trim(),
      filters,
      limit
    );

    return NextResponse.json({
      data: { results, dogfoodQueryId },
      error: null,
      meta: { queryType, total: results.length },
    });
  } catch (error) {
    console.error("[POST /api/match/task]", error);
    return NextResponse.json(
      { data: null, error: "Failed to match task" },
      { status: 500 }
    );
  }
}
