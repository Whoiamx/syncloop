import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// GET /api/projects/[id]/frames/[filename] — serve a single frame image
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  try {
    // Sanitize filename to prevent path traversal
    const safe = path.basename(params.filename);
    if (!safe.startsWith("frame_") || !safe.endsWith(".jpg")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      params.id,
      "frames",
      safe
    );

    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Frame not found" }, { status: 404 });
  }
}
