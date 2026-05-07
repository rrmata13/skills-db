import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [total, unreviewed, favorited, hidden, installed] = await Promise.all([
      prisma.skill.count(),
      prisma.skill.count({ where: { curationStatus: "unreviewed" } }),
      prisma.skill.count({ where: { curationStatus: "favorited" } }),
      prisma.skill.count({ where: { curationStatus: "hidden" } }),
      prisma.skill.count({ where: { installedAt: { not: null } } }),
    ]);

    return NextResponse.json({
      data: { total, unreviewed, favorited, hidden, installed },
      error: null,
    });
  } catch (error) {
    console.error("[GET /api/curate/stats]", error);
    return NextResponse.json(
      { data: null, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
