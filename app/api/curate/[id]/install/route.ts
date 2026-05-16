import { installSkillWithPersistence } from "@/lib/services/skill-curation";
import { logSkillUse } from "@/lib/services/dogfood-logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const bodySchema = z
  .object({
    force: z.boolean().optional(),
    // SOL-1018: optional dogfood click-through attribution. Client passes
    // dogfoodQueryId + rank when install was triggered from a match result.
    dogfoodQueryId: z.string().optional(),
    rank: z.number().int().min(1).max(50).optional(),
  })
  .optional();

function statusForError(kind: string): number {
  switch (kind) {
    case "not_found":
      return 404;
    case "exists_outside_skillmapper":
      return 409;
    case "partial_install":
    case "internal":
      return 500;
    default:
      return 400;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const raw = await request.text();
    const parsed = bodySchema.safeParse(raw ? JSON.parse(raw) : undefined);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: "Invalid input" },
        { status: 400 }
      );
    }

    const result = await installSkillWithPersistence(id, {
      force: parsed.data?.force,
    });

    if (!result.ok) {
      return NextResponse.json(
        { data: null, error: result.error },
        { status: statusForError(result.error.kind) }
      );
    }

    // SOL-1018 dogfood: log the install as a click-through event so the report
    // generator can compute CTR per rank position. Fire-and-forget; never blocks
    // the install response on logger failure.
    await logSkillUse({
      skillId: id,
      useType: "install",
      userQueryId: parsed.data?.dogfoodQueryId ?? null,
      rank: parsed.data?.rank ?? null,
    });

    return NextResponse.json({
      data: {
        id,
        installedAt: result.installedAt,
        installedPath: result.path,
        body: result.body,
        existed: result.existed,
      },
      error: null,
    });
  } catch (error) {
    console.error("[POST /api/curate/:id/install]", error);
    return NextResponse.json(
      { data: null, error: { kind: "internal", cause: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}
