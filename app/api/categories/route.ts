import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/constants";

export async function GET() {
  try {
    // Get category counts from DB
    const categoryCounts = await prisma.skillCategory.groupBy({
      by: ["category"],
      _count: { category: true },
    });

    const countMap = new Map(
      categoryCounts.map((c) => [c.category, c._count.category])
    );

    const categories = CATEGORIES.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      count: countMap.get(cat.slug) || 0,
    })).filter((c) => c.count > 0);

    // Sort by count descending
    categories.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      data: categories,
      error: null,
      meta: { total: categories.length },
    });
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
