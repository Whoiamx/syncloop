import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";

const createProjectSchema = z.object({
  title: z.string().min(1).max(500),
  template: z.enum(["tutorial", "product_demo"]).optional(),
});

// POST /api/projects — Create project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const [project] = await db
      .insert(projects)
      .values({
        title: parsed.data.title,
        template: parsed.data.template ?? null,
      })
      .returning();

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/projects — List projects
export async function GET() {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));

    // Get video info for each project
    const projectsWithVideos = await Promise.all(
      allProjects.map(async (project) => {
        const [video] = await db
          .select()
          .from(videos)
          .where(eq(videos.projectId, project.id))
          .limit(1);
        return { ...project, video: video ?? null };
      })
    );

    return NextResponse.json(projectsWithVideos);
  } catch (error) {
    console.error("Error listing projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
