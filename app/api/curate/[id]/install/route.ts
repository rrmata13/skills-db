import { installSkillWithPersistence } from "@/lib/services/skill-curation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const bodySchema = z
  .object({ force: z.boolean().optional() })
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
