import { uninstallSkillWithPersistence } from "@/lib/services/skill-curation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await uninstallSkillWithPersistence(id);

    if (!result.ok) {
      const status = result.error.kind === "not_found" ? 404 : 400;
      return NextResponse.json({ data: null, error: result.error }, { status });
    }

    return NextResponse.json({
      data: {
        id,
        installedAt: result.installedAt,
        installedPath: result.installedPath,
        removed: result.removed,
      },
      error: null,
    });
  } catch (error) {
    console.error("[POST /api/curate/:id/uninstall]", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          kind: "internal",
          cause: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
