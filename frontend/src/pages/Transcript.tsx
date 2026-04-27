import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { JobDetail } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { TranscriptViewer } from "../components/TranscriptViewer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";

export function TranscriptPage() {
  const session = useAuthStore((state) => state.session);
  const { jobId } = useParams<{ jobId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollingVersion, setPollingVersion] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Loading job status...");
  const timeoutRef = useRef<number | null>(null);

  const canPoll = useMemo(
    () =>
      jobId !== undefined &&
      (!job || (job.status !== "COMPLETED" && job.status !== "FAILED")) &&
      !pollingTimedOut,
    [job, jobId, pollingTimedOut],
  );

  const clearScheduledPoll = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const fetchJob = async () => {
    if (!jobId) {
      return null;
    }

    const response = await apiRequest<JobDetail>(`/job/${jobId}`);
    setJob(response);
    setStatusMessage(`Current status: ${response.status}`);
    return response;
  };

  useEffect(() => {
    if (!jobId || !session) {
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async (delayMs: number, attempt: number) => {
      clearScheduledPoll();

      timeoutRef.current = window.setTimeout(async () => {
        if (cancelled) {
          return;
        }

        if (Date.now() - startedAt >= 15 * 60 * 1000) {
          setPollingTimedOut(true);
          setStatusMessage("Polling timed out after 15 minutes.");
          return;
        }

        try {
          const response = await fetchJob();
          if (!response || response.status === "COMPLETED" || response.status === "FAILED") {
            return;
          }

          const nextDelay = Math.min(delayMs * 2, 30000);
          await poll(nextDelay, attempt + 1);
        } catch (pollError) {
          setError(pollError instanceof Error ? pollError.message : "Unable to poll the job.");
        }
      }, delayMs);
    };

    void (async () => {
      try {
        setError(null);
        setPollingTimedOut(false);
        const response = await fetchJob();
        if (!response || response.status === "COMPLETED" || response.status === "FAILED") {
          return;
        }
        await poll(3000, 0);
      } catch (initialError) {
        setError(initialError instanceof Error ? initialError.message : "Unable to load the job.");
      }
    })();

    return () => {
      cancelled = true;
      clearScheduledPoll();
    };
  }, [jobId, pollingVersion, session]);

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  if (!jobId) {
    return <Navigate replace to="/404" />;
  }

  const handleRetry = async () => {
    if (!job) {
      return;
    }

    try {
      setIsRetrying(true);
      setError(null);
      await apiRequest<{ jobId: string }>("/transcribe", {
        method: "POST",
        body: JSON.stringify({
          durationSeconds: job.durationSeconds,
          fileName: job.fileName,
          s3Key: job.s3Key,
          speakerCount: 2,
        }),
      });
      setJob((current) => (current ? { ...current, failureReason: "", status: "PENDING" } : current));
      setPollingTimedOut(false);
      setStatusMessage("Retry requested. Polling again...");
      setPollingVersion((current) => current + 1);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to retry this job.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Transcript job {jobId}</h1>
        </div>
        {job ? <StatusBadge status={job.status} /> : null}
      </div>

      <Card>
        <CardHeader className="border-b border-border/70 bg-white/50">
          <CardTitle>Processing status</CardTitle>
          <CardDescription>Polling starts at 3 seconds and backs off to a maximum 30-second interval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {job && canPoll ? (
            <div className="flex items-center gap-3 rounded-[24px] border border-border/70 bg-white/70 p-4">
              <Spinner className="h-5 w-5" />
              <div>
                <p className="font-medium">{statusMessage}</p>
                <p className="text-sm text-muted-foreground">Waiting for a terminal Transcribe status.</p>
              </div>
            </div>
          ) : null}

          {job?.status === "FAILED" ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-red-800">Transcription failed</p>
              <p className="mt-1 text-sm text-red-700">{job.failureReason || "Transcribe did not return a failure reason."}</p>
              <Button className="mt-4" disabled={isRetrying} onClick={() => void handleRetry()} variant="outline">
                <RotateCcw className="h-4 w-4" />
                {isRetrying ? "Retrying" : "Try Again"}
              </Button>
            </div>
          ) : null}

          {pollingTimedOut ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
              Polling stopped after 15 minutes without a terminal status. Refresh later or return to the dashboard.
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </CardContent>
      </Card>

      {job?.status === "COMPLETED" && job.transcriptText && job.rawTranscript ? (
        <TranscriptViewer jobId={job.jobId} rawTranscript={job.rawTranscript} transcriptText={job.transcriptText} />
      ) : null}
    </div>
  );
}
