import { syncAllSources } from "@/lib/services/ingestion";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const result = await syncAllSources();

    return NextResponse.json({
      data: result,
      error: null,
    });
  } catch (error) {
    console.error("[POST /api/sync/sources]", error);
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
