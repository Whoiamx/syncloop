import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos, subtitles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exportVideoWithSubtitles } from "@/lib/ffmpeg-export";
import path from "path";
import fs from "fs/promises";
import { createReadStream, statSync } from "fs";

// POST /api/projects/[id]/export — trigger export
export async function POST(
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
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, params.id))
      .limit(1);

    if (!video) {
      return NextResponse.json({ error: "No video uploaded" }, { status: 400 });
    }

    const projectSubtitles = await db
      .select()
      .from(subtitles)
      .where(eq(subtitles.projectId, params.id))
      .orderBy(subtitles.index);

    if (projectSubtitles.length === 0) {
      return NextResponse.json({ error: "No subtitles to export" }, { status: 400 });
    }

    const outputDir = path.join(process.cwd(), "uploads", params.id, "exports");
    const outputPath = path.join(outputDir, `${project.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_subtitled.mp4`);

    const result = await exportVideoWithSubtitles({
      videoPath: video.filePath,
      subtitles: projectSubtitles.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        text: s.text,
      })),
      outputPath,
      style: project.subtitleStyle as Record<string, unknown> | undefined,
      videoEdits: project.videoEdits as { trimStart?: number | null; trimEnd?: number | null; deletedSections?: { start: number; end: number }[] } | undefined,
    });

    // Update project status
    await db
      .update(projects)
      .set({ status: "complete", updatedAt: new Date() })
      .where(eq(projects.id, params.id));

    return NextResponse.json({
      success: true,
      outputPath: result.outputPath,
      fileSize: result.fileSize,
      downloadUrl: `/api/projects/${params.id}/export`,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/export — download exported file
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
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const exportDir = path.join(process.cwd(), "uploads", params.id, "exports");

    let exportFile: string | null = null;
    try {
      const files = await fs.readdir(exportDir);
      const mp4 = files.find((f) => f.endsWith(".mp4"));
      if (mp4) exportFile = path.join(exportDir, mp4);
    } catch {
      // Directory doesn't exist
    }

    if (!exportFile) {
      return NextResponse.json({ error: "No export available" }, { status: 404 });
    }

    const stat = statSync(exportFile);
    const fileName = path.basename(exportFile);
    const stream = createReadStream(exportFile);

    // Convert Node stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on("end", () => {
          controller.close();
        });
        stream.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": stat.size.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
