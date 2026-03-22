import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractFrames } from "@/lib/ffmpeg";
import path from "path";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, params.id))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get video
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, params.id))
      .limit(1);

    if (!video) {
      return NextResponse.json(
        { error: "No video uploaded for this project" },
        { status: 400 }
      );
    }

    // Extract frames
    const framesDir = path.join(
      process.cwd(),
      "uploads",
      params.id,
      "frames"
    );

    const result = await extractFrames({
      videoPath: video.filePath,
      outputDir: framesDir,
      intervalSeconds: 2,
    });

    // Update project status
    await db
      .update(projects)
      .set({ status: "frames_extracted", updatedAt: new Date() })
      .where(eq(projects.id, params.id));

    return NextResponse.json({
      frameCount: result.frameCount,
      intervalSeconds: result.intervalSeconds,
    });
  } catch (error) {
    console.error("Error extracting frames:", error);
    return NextResponse.json(
      { error: "Frame extraction failed. Is FFmpeg installed?" },
      { status: 500 }
    );
  }
}
