import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

export interface ExtractFramesOptions {
  videoPath: string;
  outputDir: string;
  intervalSeconds?: number; // default 2
}

export interface ExtractFramesResult {
  frameCount: number;
  framePaths: string[];
  intervalSeconds: number;
}

export async function extractFrames({
  videoPath,
  outputDir,
  intervalSeconds = 2,
}: ExtractFramesOptions): Promise<ExtractFramesResult> {
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const framePaths: string[] = [];

    ffmpeg(videoPath)
      .outputOptions([
        `-vf`, `fps=1/${intervalSeconds}`,
        `-q:v`, `2`,
      ])
      .output(path.join(outputDir, "frame_%04d.jpg"))
      .on("end", async () => {
        try {
          const files = await fs.readdir(outputDir);
          const sorted = files
            .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
            .sort();
          for (const file of sorted) {
            framePaths.push(path.join(outputDir, file));
          }
          resolve({
            frameCount: framePaths.length,
            framePaths,
            intervalSeconds,
          });
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        reject(new Error(`FFmpeg frame extraction failed: ${err.message}`));
      })
      .run();
  });
}
