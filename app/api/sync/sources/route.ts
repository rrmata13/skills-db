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
    return NextResponse.json(
      { data: null, error: "Sync failed" },
      { status: 500 }
    );
  }
}
