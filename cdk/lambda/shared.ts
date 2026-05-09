import type { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const SUPPORTED_AUDIO_EXTENSIONS = ["mp3", "m4a"] as const;

export type SupportedAudioExtension = (typeof SUPPORTED_AUDIO_EXTENSIONS)[number];
export type AuditActor = "SYSTEM" | "USER";
export type AuditEventType =
  | "JOB_CREATED"
  | "TRANSCRIBE_STARTED"
  | "TRANSCRIBE_RETRIED"
  | "TRANSCRIBE_COMPLETED"
  | "TRANSCRIBE_FAILED"
  | "JOB_SOFT_DELETED";

export interface AuditEvent {
  actor: AuditActor;
  createdAt: string;
  eventType: AuditEventType;
  message: string;
}

export interface ErrorBody {
  success: false;
  error: string;
  code: string;
}

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export function errorResponse(statusCode: number, code: string, error: string) {
  return jsonResponse(statusCode, {
    success: false,
    error,
    code,
  } satisfies ErrorBody);
}

export function createAuditEvent(
  eventType: AuditEventType,
  message: string,
  actor: AuditActor,
  createdAt = new Date().toISOString(),
): AuditEvent {
  return {
    actor,
    createdAt,
    eventType,
    message,
  };
}

export function getUserId(event: APIGatewayProxyEventV2): string | null {
  const requestContext =
    event.requestContext as APIGatewayProxyEventV2WithJWTAuthorizer["requestContext"];
  const claims = requestContext.authorizer?.jwt?.claims;
  const sub = typeof claims?.sub === "string" ? claims.sub : null;
  return sub && sub.trim().length > 0 ? sub : null;
}

export function parseJsonBody<T>(body: string | undefined | null): T | null {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export function isValidJobId(jobId: string): boolean {
  return ULID_REGEX.test(jobId);
}

export function isOwnedUploadKey(userId: string, s3Key: string): boolean {
  const details = extractAudioObjectDetailsFromS3Key(s3Key);
  if (!details) {
    return false;
  }

  return s3Key === buildUploadS3Key(userId, details.jobId, details.fileExtension);
}

export function extractJobIdFromS3Key(s3Key: string): string | null {
  return extractAudioObjectDetailsFromS3Key(s3Key)?.jobId ?? null;
}

export function buildUploadS3Key(
  userId: string,
  jobId: string,
  fileExtension: SupportedAudioExtension,
): string {
  return `uploads/${userId}/${jobId}/audio.${fileExtension}`;
}

export function normalizeSupportedAudioExtension(
  value: string | null | undefined,
): SupportedAudioExtension | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/^\./, "");
  return isSupportedAudioExtension(normalized) ? normalized : null;
}

export function mediaFormatFromExtension(fileExtension: SupportedAudioExtension): "mp3" | "mp4" {
  return fileExtension === "m4a" ? "mp4" : "mp3";
}

export function extractAudioObjectDetailsFromS3Key(s3Key: string): {
  fileExtension: SupportedAudioExtension;
  jobId: string;
  mediaFormat: "mp3" | "mp4";
} | null {
  const parts = s3Key.split("/");
  if (parts.length !== 4) {
    return null;
  }

  if (parts[0] !== "uploads") {
    return null;
  }

  const [, , jobId, fileName] = parts;
  const fileExtension = fileName === "audio.mp3" ? "mp3" : fileName === "audio.m4a" ? "m4a" : null;
  if (!fileExtension || !isValidJobId(jobId)) {
    return null;
  }

  return {
    fileExtension,
    jobId,
    mediaFormat: mediaFormatFromExtension(fileExtension),
  };
}

export function formatDurationSeconds(durationSeconds: number): number {
  return Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.round(durationSeconds) : 0;
}

export function formatTranscript(rawTranscript: unknown): { text: string; wordCount: number } {
  const transcript = rawTranscript as {
    results?: {
      transcripts?: Array<{ transcript?: string }>;
      items?: Array<{
        type?: string;
        start_time?: string;
        alternatives?: Array<{ content?: string }>;
      }>;
      speaker_labels?: {
        segments?: Array<{
          speaker_label?: string;
          items?: Array<{ start_time?: string }>;
        }>;
      };
    };
  };

  const fullTranscript = transcript.results?.transcripts?.[0]?.transcript?.trim() ?? "";
  const wordCount = fullTranscript.length === 0 ? 0 : fullTranscript.split(/\s+/).length;
  const items = transcript.results?.items ?? [];
  const speakerSegments = transcript.results?.speaker_labels?.segments ?? [];

  if (items.length === 0 || speakerSegments.length === 0) {
    return { text: fullTranscript, wordCount };
  }

  const speakerByStart = new Map<string, string>();
  for (const segment of speakerSegments) {
    const speaker = segment.speaker_label ?? "spk_0";
    for (const item of segment.items ?? []) {
      if (item.start_time) {
        speakerByStart.set(item.start_time, speaker);
      }
    }
  }

  const lines: string[] = [];
  let currentSpeaker: string | null = null;
  let currentContent = "";

  const pushCurrent = () => {
    if (!currentSpeaker || currentContent.trim().length === 0) {
      return;
    }

    lines.push(`[Speaker ${speakerLabelToNumber(currentSpeaker)}]:`);
    lines.push(currentContent.trim());
    lines.push("");
  };

  for (const item of items) {
    const content = item.alternatives?.[0]?.content ?? "";
    if (!content) {
      continue;
    }

    if (item.type === "punctuation") {
      currentContent += content;
      continue;
    }

    const speaker: string | null = item.start_time
      ? (speakerByStart.get(item.start_time) ?? currentSpeaker)
      : currentSpeaker;
    if (speaker && speaker !== currentSpeaker) {
      pushCurrent();
      currentSpeaker = speaker;
      currentContent = content;
    } else {
      currentSpeaker = speaker ?? currentSpeaker ?? "spk_0";
      currentContent = currentContent.length === 0 ? content : `${currentContent} ${content}`;
    }
  }

  pushCurrent();

  const text = lines.join("\n").trim() || fullTranscript;
  return { text, wordCount };
}

function speakerLabelToNumber(label: string): number {
  const numericPart = label.replace("spk_", "");
  const parsed = Number.parseInt(numericPart, 10);
  return Number.isFinite(parsed) ? parsed + 1 : 1;
}

function isSupportedAudioExtension(value: string): value is SupportedAudioExtension {
  return (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(value);
}
