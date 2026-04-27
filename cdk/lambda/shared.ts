import type { APIGatewayProxyEventV2, APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

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
  return s3Key === `uploads/${userId}/${extractJobIdFromS3Key(s3Key) ?? ""}/audio.mp3`;
}

export function extractJobIdFromS3Key(s3Key: string): string | null {
  const parts = s3Key.split("/");
  if (parts.length !== 4) {
    return null;
  }

  if (parts[0] !== "uploads" || parts[3] !== "audio.mp3") {
    return null;
  }

  const [, , jobId] = parts;
  return isValidJobId(jobId) ? jobId : null;
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
