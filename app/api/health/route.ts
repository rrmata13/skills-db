import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const skillCount = await prisma.skill.count();
    const sourceCount = await prisma.sourceRepository.count();
    return NextResponse.json({
      data: {
        status: "healthy",
        database: "connected",
        skills: skillCount,
        sources: sourceCount,
        timestamp: new Date().toISOString(),
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
