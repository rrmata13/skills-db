import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const tags = searchParams.get("tags") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
        { tags: { some: { tag: { contains: q } } } },
      ];
    }

    if (category) {
      where.categories = { some: { category } };
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim());
      where.tags = { some: { tag: { in: tagList } } };
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          sourceRepository: { select: { id: true, name: true, author: true, sourceUrl: true } },
          categories: { select: { category: true } },
          tags: { select: { tag: true } },
          capabilities: { select: { capability: true, inputType: true, outputType: true } },
        },
        orderBy: { rating: "desc" },
        skip,
        take: limit,
      }),
      prisma.skill.count({ where }),
    ]);

    return NextResponse.json({
      data: skills,
      error: null,
      meta: { total, page, limit },
    });
  } catch (error) {
    console.error("[GET /api/skills]", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch skills" },
      { status: 500 }
    );
  }
}
