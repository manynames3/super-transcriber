export interface AuthSession {
  accessToken: string;
  email: string;
  idToken: string;
  refreshToken: string;
}

export interface ApiErrorResponse {
  code: string;
  error: string;
  success?: false;
}

export interface AuditEvent {
  actor: "SYSTEM" | "USER";
  createdAt: string;
  eventType:
    | "JOB_CREATED"
    | "TRANSCRIBE_STARTED"
    | "TRANSCRIBE_RETRIED"
    | "TRANSCRIBE_COMPLETED"
    | "TRANSCRIBE_FAILED"
    | "JOB_SOFT_DELETED";
  message: string;
}

export interface JobSummary {
  createdAt: string;
  durationSeconds: number;
  failureReason: string;
  fileName: string;
  jobId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  updatedAt: string;
  wordCount: number;
}

export interface JobDetail extends JobSummary {
  auditTrail: AuditEvent[];
  rawTranscript?: unknown;
  s3Key: string;
  transcriptText?: string;
}
