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
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-white/50">
        <CardTitle>New transcription</CardTitle>
        <CardDescription>
          MP3 only, 200MB max, direct-to-S3 upload. Duration is shown before you spend Transcribe minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <button
          className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-6 py-10 text-center transition ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/35"
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
          <UploadCloud className="mb-4 h-12 w-12 text-primary" />
          <p className="text-lg font-semibold">Drag an MP3 here or click to browse</p>
          <p className="mt-2 text-sm text-muted-foreground">
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
          <div className="rounded-[24px] border border-border/70 bg-white/70 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{file.name}</p>
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
              <span className="font-medium">Upload progress</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <ProgressBar value={uploadProgress} />
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

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
