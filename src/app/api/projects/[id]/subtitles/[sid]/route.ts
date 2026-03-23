import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtitles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";

const updateSubtitleSchema = z.object({
  text: z.string().min(1).max(2000).optional(),
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sid: string } }
) {
  try {
    const body = await req.json();
    const parsed = updateSubtitleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { text, startTime, endTime } = parsed.data;

    if (!text && startTime === undefined && endTime === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Validate timing if both provided
    if (startTime !== undefined && endTime !== undefined && startTime >= endTime) {
      return NextResponse.json(
        { error: "startTime must be less than endTime" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (text !== undefined) updateData.text = text;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;

    const [updated] = await db
      .update(subtitles)
      .set(updateData)
      .where(
        and(
          eq(subtitles.id, params.sid),
          eq(subtitles.projectId, params.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Subtitle not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating subtitle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
