import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sources = await prisma.sourceRepository.findMany({
      include: {
        _count: { select: { skills: true } },
      },
      orderBy: { rating: "desc" },
    });

    return NextResponse.json({
      data: sources.map((s) => ({
        ...s,
        skillCount: s._count.skills,
      })),
      error: null,
      meta: { total: sources.length },
    });
  } catch (error) {
    console.error("[GET /api/sources]", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}
