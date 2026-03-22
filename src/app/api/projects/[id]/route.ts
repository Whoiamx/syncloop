import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos, subtitles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import fs from "fs/promises";
import path from "path";

// GET /api/projects/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, params.id))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, project.id))
      .limit(1);

    const projectSubtitles = await db
      .select()
      .from(subtitles)
      .where(eq(subtitles.projectId, project.id))
      .orderBy(subtitles.index);

    return NextResponse.json({
      ...project,
      video: video ?? null,
      subtitles: projectSubtitles,
    });
  } catch (error) {
    console.error("Error getting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]
const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  template: z.enum(["tutorial", "product_demo"]).optional(),
  status: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get video to clean up files
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, params.id))
      .limit(1);

    // Delete project (cascades to videos and subtitles)
    const [deleted] = await db
      .delete(projects)
      .where(eq(projects.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Clean up files
    if (video) {
      const projectDir = path.join(
        process.cwd(),
        "uploads",
        params.id
      );
      try {
        await fs.rm(projectDir, { recursive: true, force: true });
      } catch {
        // Ignore file cleanup errors
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
