import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const skill = await prisma.skill.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        sourceRepository: {
          select: { id: true, name: true, author: true, sourceUrl: true, githubUrl: true },
        },
        categories: { select: { category: true } },
        tags: { select: { tag: true } },
        capabilities: {
          select: { capability: true, inputType: true, outputType: true },
        },
        relationsFrom: {
          include: {
            toSkill: {
              select: { id: true, name: true, slug: true, description: true },
            },
          },
        },
      },
    });

    if (!skill) {
      return NextResponse.json(
        { data: null, error: "Skill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: skill, error: null });
  } catch (error) {
    console.error("[GET /api/skills/:id]", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch skill" },
      { status: 500 }
    );
  }
}
