import ffmpeg from "fluent-ffmpeg";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );
      if (!videoStream) return reject(new Error("No video stream found"));

      let fps = 30;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split("/");
        fps =
          parts.length === 2
            ? Number(parts[0]) / Number(parts[1])
            : Number(parts[0]);
      }

      // Try multiple sources for duration (WebM often has no format.duration)
      let duration = Number(metadata.format.duration);
      if (!Number.isFinite(duration) || duration <= 0) {
        // Fallback: try video stream duration
        duration = Number(videoStream.duration);
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        // Fallback: try duration from tags
        const tagDuration = videoStream.tags?.DURATION || videoStream.tags?.duration;
        if (tagDuration) {
          // Format: HH:MM:SS.mmm
          const parts = tagDuration.split(":");
          if (parts.length === 3) {
            duration = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + parseFloat(parts[2]);
          }
        }
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        // Fallback: estimate from bit_rate and size
        const bitRate = Number(metadata.format.bit_rate);
        const size = Number(metadata.format.size);
        if (Number.isFinite(bitRate) && bitRate > 0 && Number.isFinite(size)) {
          duration = (size * 8) / bitRate;
        }
      }

      resolve({
        duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        fps: Math.round(fps * 100) / 100,
      });
    });
  });
}
