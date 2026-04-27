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

export async function validateMp3File(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".mp3")) {
    throw new Error("Only .mp3 files are supported.");
  }

  if (file.size > 200 * 1024 * 1024) {
    throw new Error("The selected file exceeds the 200MB limit.");
  }

  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const hasId3Header = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33;
  const hasFrameSync = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;

  if (!hasId3Header && !hasFrameSync) {
    throw new Error("The file header does not look like a valid MP3.");
  }
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
