import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos, subtitles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import fs from "fs/promises";
import path from "path";
import { z } from "zod/v4";

const SubtitleSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  text: z.string().min(1),
});

const SubtitlesResponseSchema = z.object({
  subtitles: z.array(SubtitleSchema),
});

// Max frames to send in a single GPT-4o call (context window limit)
const MAX_FRAMES_PER_CALL = 60;

function buildTimingGuide(
  frameCount: number,
  intervalSeconds: number,
  videoDuration: number
): string {
  return `TIMING GUIDE:
- Frame 0 = 0.0s, Frame 1 = ${intervalSeconds}.0s, Frame 2 = ${intervalSeconds * 2}.0s, etc.
- The last frame corresponds to approximately ${((frameCount - 1) * intervalSeconds).toFixed(1)}s
- Total video duration is ${videoDuration.toFixed(1)}s`;
}

function buildTutorialPrompt(
  title: string,
  frameCount: number,
  intervalSeconds: number,
  videoDuration: number,
  lang: string
): string {
  return `You are an expert subtitle writer for tutorial/how-to videos. You analyze video frames and create instructional, step-by-step subtitles.

VIDEO INFO:
- Title: "${title}"
- Type: Tutorial / How-To
- Duration: ${videoDuration.toFixed(1)} seconds
- Frames provided: ${frameCount} frames, one every ${intervalSeconds} seconds

STYLE RULES — TUTORIAL:
- Use an instructional tone: imperative or guiding voice (e.g. "Click on...", "Select...", "Enter your...").
- Describe actions as steps the viewer should follow.
- Focus on UI interactions: clicks, typing, navigation, menu selections.
- Group small consecutive actions into meaningful steps (don't describe every micro-movement).
- Use clear, simple, direct language. Avoid jargon unless visible on screen.
- NEVER use marketing language, vague descriptions, or promotional tone.

STRUCTURE:
1. INTRO subtitle (first subtitle): A brief greeting + what the video will teach. Example: "In this video you'll learn how to [topic from title]. Let's get started."
2. STEP subtitles: Each meaningful action gets its own subtitle in instructional tone. Examples:
   - "Click the File menu and select New Project"
   - "Enter your email address and press Continue"
   - "Open the settings panel from the sidebar"
3. TRANSITION subtitles (between major sections): Brief sentence introducing the next part. Example: "Now let's move on to configuring the export settings."
4. OUTRO subtitle (last subtitle): Wrap up. Example: "And that's it! Now you know how to [topic]. See you in the next video."

${buildTimingGuide(frameCount, intervalSeconds, videoDuration)}

SUBTITLE RULES:
- Write in ${lang}
- Each subtitle lasts 2-6 seconds
- No overlapping subtitles
- Cover the full video duration
- Aim for 1 subtitle every 2-4 seconds of video (more dense than typical subtitles — this is instructional content)

Respond with ONLY a valid JSON object in this exact format:
{
  "subtitles": [
    { "startTime": 0.0, "endTime": 3.0, "text": "Intro text here" },
    { "startTime": 3.0, "endTime": 6.0, "text": "Click on the Create button to start a new project" }
  ]
}

Do NOT include any text before or after the JSON.`;
}

function buildProductDemoPrompt(
  title: string,
  frameCount: number,
  intervalSeconds: number,
  videoDuration: number,
  lang: string
): string {
  return `You are an expert subtitle writer for product demo videos. You analyze video frames and create engaging, feature-focused subtitles.

VIDEO INFO:
- Title: "${title}"
- Type: Product Demo
- Duration: ${videoDuration.toFixed(1)} seconds
- Frames provided: ${frameCount} frames, one every ${intervalSeconds} seconds

STYLE RULES — PRODUCT DEMO:
- Use a confident and engaging tone.
- Highlight product features and benefits — what the user gains, not just what happens.
- Keep subtitles punchy and impactful.
- Emphasize visual quality, speed, simplicity, and user experience.
- NEVER use step-by-step instructions or overly technical explanations.
- NEVER sound like a tutorial. This is a showcase.

STRUCTURE:
1. HOOK subtitle (first subtitle): A compelling opening that sets the stage. Example: "Meet [product] — the fastest way to [value proposition]."
2. FEATURE subtitles: Each notable feature/screen gets a subtitle highlighting its value. Examples:
   - "A clean and intuitive dashboard for managing your data"
   - "Instant search delivers results in milliseconds"
   - "Seamlessly customize your workflow with flexible settings"
3. TRANSITION subtitles: Smooth connections between features. Example: "But that's just the beginning."
4. CLOSING subtitle (last subtitle): Strong ending. Example: "This is [product]. Built for speed, designed for you."

${buildTimingGuide(frameCount, intervalSeconds, videoDuration)}

SUBTITLE RULES:
- Write in ${lang}
- Each subtitle lasts 2-6 seconds
- No overlapping subtitles
- Cover the full video duration
- Subtitles can be slightly less dense than tutorials — let the visuals breathe

Respond with ONLY a valid JSON object in this exact format:
{
  "subtitles": [
    { "startTime": 0.0, "endTime": 3.5, "text": "Hook text here" },
    { "startTime": 3.5, "endTime": 7.0, "text": "A powerful dashboard that puts everything at your fingertips" }
  ]
}

Do NOT include any text before or after the JSON.`;
}

function buildPrompt(
  title: string,
  template: string | null,
  frameCount: number,
  intervalSeconds: number,
  videoDuration: number,
  language: string | null
): string {
  const lang = language === "es" ? "Spanish" : language === "pt" ? "Portuguese" : "English";

  if (template === "product_demo") {
    return buildProductDemoPrompt(title, frameCount, intervalSeconds, videoDuration, lang);
  }
  return buildTutorialPrompt(title, frameCount, intervalSeconds, videoDuration, lang);
}

async function loadFramesAsBase64(
  framesDir: string,
  maxFrames: number
): Promise<{ base64: string; filename: string }[]> {
  let files: string[];
  try {
    files = await fs.readdir(framesDir);
  } catch {
    return [];
  }

  const frameFiles = files
    .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
    .sort();

  // If too many frames, sample evenly
  let selected = frameFiles;
  if (frameFiles.length > maxFrames) {
    const step = frameFiles.length / maxFrames;
    selected = [];
    for (let i = 0; i < maxFrames; i++) {
      selected.push(frameFiles[Math.floor(i * step)]);
    }
  }

  const results = await Promise.all(
    selected.map(async (filename) => {
      const data = await fs.readFile(path.join(framesDir, filename));
      return { base64: data.toString("base64"), filename };
    })
  );

  return results;
}

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

    // Check frames exist
    const framesDir = path.join(process.cwd(), "uploads", params.id, "frames");
    const frames = await loadFramesAsBase64(framesDir, MAX_FRAMES_PER_CALL);

    if (frames.length === 0) {
      return NextResponse.json(
        { error: "No frames extracted. Extract frames first." },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await db
      .update(projects)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(eq(projects.id, params.id));

    // Build GPT-4o request with frames as images
    const intervalSeconds = 2;
    const prompt = buildPrompt(
      project.title,
      project.template,
      frames.length,
      intervalSeconds,
      video.duration ?? frames.length * intervalSeconds,
      project.language
    );

    const imageContent = frames.map((frame) => ({
      type: "image" as const,
      image: `data:image/jpeg;base64,${frame.base64}`,
    }));

    const result = await generateText({
      model: "openai/gpt-4o",
      maxTokens: 4096,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...imageContent],
        },
      ],
    });

    const content = result.text;
    if (!content) {
      await db
        .update(projects)
        .set({ status: "frames_extracted", updatedAt: new Date() })
        .where(eq(projects.id, params.id));
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed;
    try {
      parsed = SubtitlesResponseSchema.parse(JSON.parse(jsonStr));
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      await db
        .update(projects)
        .set({ status: "frames_extracted", updatedAt: new Date() })
        .where(eq(projects.id, params.id));
      return NextResponse.json(
        { error: "AI returned invalid subtitle format" },
        { status: 500 }
      );
    }

    // Delete existing subtitles for this project
    await db
      .delete(subtitles)
      .where(eq(subtitles.projectId, params.id));

    // Insert new subtitles
    const subtitleRows = parsed.subtitles.map((sub, i) => ({
      projectId: params.id,
      index: i,
      startTime: sub.startTime,
      endTime: sub.endTime,
      text: sub.text,
      source: "ai_generated" as const,
    }));

    if (subtitleRows.length > 0) {
      await db.insert(subtitles).values(subtitleRows);
    }

    // Update status to ready
    await db
      .update(projects)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(projects.id, params.id));

    return NextResponse.json({
      subtitleCount: parsed.subtitles.length,
      subtitles: parsed.subtitles,
    });
  } catch (error) {
    console.error("Error generating subtitles:", error);
    // Try to reset status
    try {
      await db
        .update(projects)
        .set({ status: "frames_extracted", updatedAt: new Date() })
        .where(eq(projects.id, params.id));
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: "Subtitle generation failed. Check your AI_GATEWAY_API_KEY." },
      { status: 500 }
    );
  }
}
