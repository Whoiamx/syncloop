import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// GET /api/projects/[id]/frames — list extracted frames
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const framesDir = path.join(
      process.cwd(),
      "uploads",
      params.id,
      "frames"
    );

    let files: string[];
    try {
      files = await fs.readdir(framesDir);
    } catch {
      return NextResponse.json({ frames: [], count: 0 });
    }

    const frames = files
      .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
      .sort()
      .map((f, i) => ({
        index: i,
        filename: f,
        url: `/api/projects/${params.id}/frames/${f}`,
      }));

    return NextResponse.json({ frames, count: frames.length });
  } catch (error) {
    console.error("Error listing frames:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
