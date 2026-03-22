import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getVideoMetadata } from "@/lib/ffprobe";
import fs from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
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

    const formData = await req.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: mp4, webm, mov, avi" },
        { status: 400 }
      );
    }

    // Create upload directory
    const projectDir = path.join(process.cwd(), "uploads", params.id);
    await fs.mkdir(projectDir, { recursive: true });

    // Save file
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(projectDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Extract metadata with FFprobe
    let metadata;
    try {
      metadata = await getVideoMetadata(filePath);
    } catch (err) {
      // Clean up file on probe failure
      await fs.unlink(filePath).catch(() => {});
      console.error("FFprobe error:", err);
      return NextResponse.json(
        { error: "Could not read video metadata. Is FFmpeg installed?" },
        { status: 422 }
      );
    }

    // Validate duration (5-20 minutes)
    if (metadata.duration > 1200) {
      await fs.unlink(filePath).catch(() => {});
      return NextResponse.json(
        { error: "Video is too long. Maximum 20 minutes." },
        { status: 400 }
      );
    }

    // Delete existing video for this project (if re-uploading)
    await db.delete(videos).where(eq(videos.projectId, params.id));

    // Save video record
    const [video] = await db
      .insert(videos)
      .values({
        projectId: params.id,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
      })
      .returning();

    // Update project status
    await db
      .update(projects)
      .set({ status: "uploaded", updatedAt: new Date() })
      .where(eq(projects.id, params.id));

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
