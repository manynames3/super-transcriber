import { Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractAudioDuration, estimateTranscribeCost, formatDuration, validateMp3File } from "../lib/audio";
import { apiRequest } from "../lib/api";
import { useJobStore } from "../store/jobStore";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ProgressBar } from "./ProgressBar";

interface UploadUrlResponse {
  jobId: string;
  presignedUrl: string;
  s3Key: string;
}

interface UploadDropzoneProps {
  onUploaded: () => Promise<void>;
}

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadProgress = useJobStore((state) => state.uploadProgress);
  const setUploadProgress = useJobStore((state) => state.setUploadProgress);

  const processFile = async (nextFile: File) => {
    setError(null);
    setIsSubmitting(false);
    setUploadProgress(0);

    await validateMp3File(nextFile);
    const duration = await extractAudioDuration(nextFile);

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Unable to determine the duration of this audio file.");
    }

    setFile(nextFile);
    setDurationSeconds(duration);
  };

  const handleFiles = async (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) {
      return;
    }

    try {
      await processFile(selected);
    } catch (uploadError) {
      setFile(null);
      setDurationSeconds(null);
      setError(uploadError instanceof Error ? uploadError.message : "Unable to read the selected file.");
    }
  };

  const uploadWithProgress = (presignedUrl: string, currentFile: File) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", "audio/mpeg");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress((event.loaded / event.total) * 100);
        }
      };

      xhr.onerror = () => reject(new Error("Failed to upload the file to S3."));
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
          return;
        }
        reject(new Error(`Upload failed with status ${xhr.status}.`));
      };

      xhr.send(currentFile);
    });

  const handleSubmit = async () => {
    if (!file || durationSeconds === null) {
      setError("Select a valid MP3 file first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const uploadTarget = await apiRequest<UploadUrlResponse>("/upload-url", {
        method: "POST",
      });

      await uploadWithProgress(uploadTarget.presignedUrl, file);

      const result = await apiRequest<{ jobId: string }>("/transcribe", {
        method: "POST",
        body: JSON.stringify({
          durationSeconds,
          fileName: file.name,
          s3Key: uploadTarget.s3Key,
          speakerCount: 2,
        }),
      });

      setUploadProgress(100);
      await onUploaded();
      navigate(`/transcript/${result.jobId}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-line overflow-hidden">
      <CardHeader className="border-b border-white/8 bg-transparent">
        <CardTitle>New transcription</CardTitle>
        <CardDescription>
          MP3 only, 200MB max, direct-to-S3 upload. Duration is shown before you spend Transcribe minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <button
          className={`flex min-h-[240px] w-full flex-col items-center justify-center rounded-[24px] border px-6 py-10 text-center transition ${
            isDragging
              ? "border-primary bg-[rgba(212,168,67,0.08)]"
              : "border-white/10 bg-[rgba(255,255,255,0.02)] hover:border-[rgba(212,168,67,0.35)] hover:bg-[rgba(255,255,255,0.04)]"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDrop={async (event) => {
            event.preventDefault();
            setIsDragging(false);
            await handleFiles(event.dataTransfer.files);
          }}
          type="button"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(212,168,67,0.2)] bg-[rgba(212,168,67,0.1)]">
            <UploadCloud className="h-7 w-7 text-primary" />
          </div>
          <p className="text-xl font-medium tracking-[-0.02em]">Drag an MP3 here or click to browse</p>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            The browser validates the MP3 header, file size, and duration before any network call.
          </p>
        </button>

        <input
          accept=".mp3,audio/mpeg"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />

        {file && durationSeconds !== null ? (
          <div className="panel-soft rounded-[24px] p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Duration: <span className="font-medium text-foreground">{formatDuration(durationSeconds)}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Estimated variable Transcribe cost after the free tier: ${estimateTranscribeCost(durationSeconds)}
            </p>
          </div>
        ) : null}

        {isSubmitting ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Upload progress</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <ProgressBar value={uploadProgress} />
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex justify-end">
          <Button disabled={!file || durationSeconds === null || isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Uploading" : "Upload and transcribe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
