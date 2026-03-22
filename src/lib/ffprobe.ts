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

      const duration = Number(metadata.format.duration);

      resolve({
        duration: Number.isFinite(duration) ? duration : 0,
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        fps: Math.round(fps * 100) / 100,
      });
    });
  });
}
