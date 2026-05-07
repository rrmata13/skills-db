import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const patchSchema = z
  .object({
    curationStatus: z.enum(["unreviewed", "favorited", "hidden"]).optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => data.curationStatus !== undefined || data.notes !== undefined, {
    message: "At least one of curationStatus or notes is required",
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: `Invalid input: ${parsed.error.issues[0]?.message || "Bad request"}` },
        { status: 400 }
      );
    }

    const existing = await prisma.skill.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ data: null, error: "Skill not found" }, { status: 404 });
    }

    const updated = await prisma.skill.update({
      where: { id: existing.id },
      data: parsed.data,
      select: {
        id: true,
        slug: true,
        curationStatus: true,
        notes: true,
        installedAt: true,
        installedPath: true,
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error("[PATCH /api/curate/:id]", error);
    return NextResponse.json(
      { data: null, error: "Failed to update curation" },
      { status: 500 }
    );
  }
}
