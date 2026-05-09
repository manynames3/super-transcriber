export type SupportedAudioExtension = "mp3" | "m4a";

export interface AudioUploadMetadata {
  contentType: string;
  fileExtension: SupportedAudioExtension;
}

export async function extractAudioDuration(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return decoded.duration;
  } finally {
    await audioContext.close();
  }
}

export async function validateAudioFile(file: File): Promise<AudioUploadMetadata> {
  const fileExtension = getSupportedAudioExtension(file.name);
  if (!fileExtension) {
    throw new Error("Only .mp3 and .m4a files are supported.");
  }

  if (file.size > 200 * 1024 * 1024) {
    throw new Error("The selected file exceeds the 200MB limit.");
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (fileExtension === "mp3") {
    const hasId3Header = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
    const hasFrameSync = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;

    if (!hasId3Header && !hasFrameSync) {
      throw new Error("The file header does not look like a valid MP3.");
    }

    return {
      contentType: file.type || "audio/mpeg",
      fileExtension,
    };
  }

  const hasFtypBox =
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70;

  if (!hasFtypBox) {
    throw new Error("The file header does not look like a valid M4A.");
  }

  return {
    contentType: file.type || "audio/mp4",
    fileExtension,
  };
}

export function formatDuration(durationSeconds: number) {
  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function estimateTranscribeCost(durationSeconds: number) {
  return ((durationSeconds / 60) * 0.024).toFixed(4);
}

function getSupportedAudioExtension(fileName: string): SupportedAudioExtension | null {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".mp3")) {
    return "mp3";
  }

  if (normalized.endsWith(".m4a")) {
    return "m4a";
  }

  return null;
}
