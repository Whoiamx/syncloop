import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

interface SubtitleEntry {
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleStyleOptions {
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  showBackground?: boolean;
}

export interface VideoEditsOptions {
  trimStart?: number | null;
  trimEnd?: number | null;
  deletedSections?: { start: number; end: number }[];
}

export interface ExportOptions {
  videoPath: string;
  subtitles: SubtitleEntry[];
  outputPath: string;
  style?: SubtitleStyleOptions;
  videoEdits?: VideoEditsOptions;
}

function escapeDrawText(text: string): string {
  // Escape special characters for FFmpeg drawtext filter
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019") // Replace apostrophe with unicode right single quote
    .replace(/"/g, '\\\\"')
    .replace(/:/g, "\\\\:")
    .replace(/\n/g, "")
    .replace(/%/g, "%%");
}

function hexToFFmpeg(hex: string): string {
  // Convert #rrggbb to FFmpeg color format
  return hex.startsWith("#") ? "0x" + hex.slice(1) : hex;
}

function buildDrawTextFilters(subtitles: SubtitleEntry[], style?: SubtitleStyleOptions): string {
  const fontSize = style?.fontSize ?? 24;
  const fontColor = style?.textColor ? hexToFFmpeg(style.textColor) : "white";
  const fontFamily = style?.fontFamily ?? "Arial";
  const showBg = style?.showBackground ?? true;
  const bgColor = style?.backgroundColor ? hexToFFmpeg(style.backgroundColor) : "0x000000";
  const bgOpacity = style?.backgroundOpacity ?? 0.75;

  // FFmpeg box color with alpha (format: color@opacity)
  const boxColor = showBg ? `${bgColor}@${bgOpacity.toFixed(2)}` : undefined;

  return subtitles
    .map((sub) => {
      const escaped = escapeDrawText(sub.text);
      let filter =
        `drawtext=text='${escaped}'` +
        `:fontsize=${fontSize}` +
        `:fontcolor=${fontColor}` +
        `:fontfamily=${fontFamily}` +
        `:borderw=2` +
        `:bordercolor=black` +
        `:x=(w-text_w)/2` +
        `:y=h-th-40` +
        `:enable='between(t,${sub.startTime.toFixed(3)},${sub.endTime.toFixed(3)})'`;

      if (boxColor) {
        filter += `:box=1:boxcolor=${boxColor}:boxborderw=8`;
      }

      return filter;
    })
    .join(",");
}

function filterSubtitlesByEdits(
  subtitles: SubtitleEntry[],
  trimStart: number,
  trimEnd: number,
  deletedSections: { start: number; end: number }[]
): SubtitleEntry[] {
  return subtitles.filter((sub) => {
    // Exclude subtitles outside trim range
    if (sub.endTime <= trimStart || sub.startTime >= trimEnd) return false;
    // Exclude subtitles inside deleted sections
    for (const section of deletedSections) {
      if (sub.startTime >= section.start && sub.endTime <= section.end) return false;
    }
    return true;
  });
}

export async function exportVideoWithSubtitles({
  videoPath,
  subtitles,
  outputPath,
  style,
  videoEdits,
}: ExportOptions): Promise<{ outputPath: string; fileSize: number }> {
  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Remove existing output file if present
  try {
    await fs.unlink(outputPath);
  } catch {
    // File doesn't exist, that's fine
  }

  const trimStart = videoEdits?.trimStart ?? 0;
  const trimEnd = videoEdits?.trimEnd ?? Infinity;
  const deletedSections = videoEdits?.deletedSections ?? [];

  // Filter subtitles to only include those within the effective range
  const effectiveSubtitles = filterSubtitlesByEdits(subtitles, trimStart, trimEnd, deletedSections);

  if (effectiveSubtitles.length === 0 && subtitles.length > 0) {
    // All subtitles filtered — still export but without subtitles
  }

  const hasSubtitles = effectiveSubtitles.length > 0;
  const filterComplex = hasSubtitles ? buildDrawTextFilters(effectiveSubtitles, style) : "";

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath);

    // Apply trim (seek to start, limit duration)
    if (trimStart > 0) {
      cmd.setStartTime(trimStart);
    }
    if (trimEnd < Infinity) {
      cmd.setDuration(trimEnd - trimStart);
    }

    if (hasSubtitles) {
      cmd.videoFilters(filterComplex);
    }

    cmd
      .outputOptions([
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", hasSubtitles ? "copy" : "copy",
        "-movflags", "+faststart",
      ])
      .output(outputPath)
      .on("end", async () => {
        try {
          const stats = await fs.stat(outputPath);
          resolve({ outputPath, fileSize: stats.size });
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        reject(new Error(`FFmpeg export failed: ${err.message}`));
      })
      .run();
  });
}
