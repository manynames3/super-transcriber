import { Download, FileJson2, Files, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AuditEvent } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface TranscriptViewerProps {
  auditTrail: AuditEvent[];
  jobId: string;
  rawTranscript: unknown;
  transcriptText: string;
}

export function TranscriptViewer({
  auditTrail,
  jobId,
  rawTranscript,
  transcriptText,
}: TranscriptViewerProps) {
  const [copyLabel, setCopyLabel] = useState("Copy");
  const chunks = useMemo(() => chunkTranscript(transcriptText), [transcriptText]);
  const orderedAuditTrail = useMemo(
    () =>
      [...auditTrail].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    [auditTrail],
  );
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [transcriptText]);

  const words = transcriptText.trim().length === 0 ? 0 : transcriptText.trim().split(/\s+/).length;
  const characters = transcriptText.length;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
  const dateStamp = new Date().toISOString().slice(0, 10);
  const currentChunk = chunks[pageIndex] ?? "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcriptText);
    setCopyLabel("Copied ✓");
    window.setTimeout(() => setCopyLabel("Copy"), 2000);
  };

  const downloadBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-line">
      <CardHeader className="border-b border-white/8 bg-transparent">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Speaker-labeled output with quick export actions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleCopy()} variant="secondary">
              <Files className="h-4 w-4" />
              {copyLabel}
            </Button>
            <Button
              onClick={() =>
                downloadBlob(
                  transcriptText,
                  `transcript-${jobId}-${dateStamp}.txt`,
                  "text/plain;charset=utf-8",
                )
              }
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Download .txt
            </Button>
            <Button
              onClick={() =>
                downloadBlob(
                  JSON.stringify(rawTranscript, null, 2),
                  `transcript-${jobId}-raw.json`,
                  "application/json;charset=utf-8",
                )
              }
              variant="outline"
            >
              <FileJson2 className="h-4 w-4" />
              Download .json
            </Button>
            {orderedAuditTrail.length > 0 ? (
              <Button
                onClick={() =>
                  downloadBlob(
                    JSON.stringify(orderedAuditTrail, null, 2),
                    `transcript-${jobId}-audit.json`,
                    "application/json;charset=utf-8",
                  )
                }
                variant="outline"
              >
                <ShieldCheck className="h-4 w-4" />
                Audit .json
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="max-h-[60vh] overflow-y-auto rounded-[24px] border border-white/8 bg-[rgba(10,10,15,0.92)] p-5 font-mono text-sm leading-7 text-stone-100 whitespace-pre-wrap">
          {currentChunk}
        </div>

        {chunks.length > 1 ? (
          <div className="panel-soft flex items-center justify-between rounded-[20px] px-4 py-3 text-sm">
            <span>
              Chunk {pageIndex + 1} of {chunks.length}
            </span>
            <div className="flex gap-2">
              <Button disabled={pageIndex === 0} onClick={() => setPageIndex((current) => current - 1)} size="sm" variant="outline">
                Previous
              </Button>
              <Button
                disabled={pageIndex === chunks.length - 1}
                onClick={() => setPageIndex((current) => current + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 rounded-[24px] border border-white/8 bg-[rgba(28,28,38,0.88)] p-5 text-sm md:grid-cols-3">
          <Stat label="Word count" value={words.toLocaleString()} />
          <Stat label="Character count" value={characters.toLocaleString()} />
          <Stat label="Estimated read time" value={`${readTimeMinutes} min`} />
        </div>

        {orderedAuditTrail.length > 0 ? (
          <div className="rounded-[24px] border border-primary/15 bg-[rgba(212,168,67,0.06)] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">Audit trail</p>
                <p className="text-sm text-muted-foreground">Lifecycle events recorded for this transcript job.</p>
              </div>
            </div>

            <ol className="mt-4 space-y-3">
              {orderedAuditTrail.map((event, index) => (
                <li
                  className="grid gap-3 rounded-[18px] border border-white/8 bg-[rgba(12,12,18,0.58)] p-4 text-sm md:grid-cols-[180px_1fr]"
                  key={`${event.eventType}-${event.createdAt}-${index}`}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">{event.actor}</p>
                    <p className="mt-1 text-muted-foreground">{formatAuditTimestamp(event.createdAt)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{formatAuditEventType(event.eventType)}</p>
                    <p className="mt-1 text-muted-foreground">{event.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium text-foreground">{value}</p>
    </div>
  );
}

function chunkTranscript(transcriptText: string) {
  const totalWords = transcriptText.trim().length === 0 ? 0 : transcriptText.trim().split(/\s+/).length;
  if (totalWords <= 10000) {
    return [transcriptText];
  }

  const lines = transcriptText.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const line of lines) {
    const lineWordCount = line.trim().length === 0 ? 0 : line.trim().split(/\s+/).length;
    if (currentWordCount + lineWordCount > 2500 && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentWordCount = 0;
    }

    currentChunk.push(line);
    currentWordCount += lineWordCount;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

  return chunks;
}

function formatAuditEventType(eventType: AuditEvent["eventType"]) {
  return eventType
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAuditTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
