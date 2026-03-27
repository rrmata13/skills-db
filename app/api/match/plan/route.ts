import { matchPlan } from "@/lib/services/matching";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const matchPlanSchema = z.object({
  plan: z.string().min(1).max(10000),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    repositories: z.array(z.string()).optional(),
    minRating: z.number().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  limit: z.number().min(1).max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = matchPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: `Invalid input: ${parsed.error.issues[0]?.message || "Bad request"}` },
        { status: 400 }
      );
    }

    const { plan, filters, limit } = parsed.data;
    const result = await matchPlan(plan.trim(), filters, limit);

    return NextResponse.json({
      data: result,
      error: null,
      meta: { queryType: "plan" },
    });
  } catch (error) {
    console.error("[POST /api/match/plan]", error);
    return NextResponse.json(
      { data: null, error: "Failed to match plan" },
      { status: 500 }
    );
  }
}
