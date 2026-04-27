import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useJobStore, type JobSortKey } from "../store/jobStore";
import type { JobSummary } from "../types";
import { JobTable } from "../components/JobTable";
import { UploadDropzone } from "../components/UploadDropzone";

interface JobsResponse {
  items: JobSummary[];
  nextCursor: string | null;
}

export function DashboardPage() {
  const session = useAuthStore((state) => state.session);
  const jobs = useJobStore((state) => state.jobs);
  const nextCursor = useJobStore((state) => state.nextCursor);
  const setJobs = useJobStore((state) => state.setJobs);
  const appendJobs = useJobStore((state) => state.appendJobs);
  const sortDirection = useJobStore((state) => state.sortDirection);
  const sortKey = useJobStore((state) => state.sortKey);
  const setSort = useJobStore((state) => state.setSort);

  const loadJobs = async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await apiRequest<JobsResponse>(`/jobs?${params.toString()}`);
    if (cursor) {
      appendJobs(response.items, response.nextCursor);
      return;
    }

    setJobs(response.items, response.nextCursor);
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadJobs();
  }, [session]);

  const sortedJobs = useMemo(() => {
    const clone = [...jobs];
    clone.sort((left, right) => compareJobs(left, right, sortKey, sortDirection));
    return clone;
  }, [jobs, sortDirection, sortKey]);

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  const handleDelete = async (jobId: string) => {
    await apiRequest(`/job/${jobId}`, {
      method: "DELETE",
    });
    await loadJobs();
  };

  const handleSort = (key: JobSortKey) => {
    setSort(key);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Dashboard</p>
        <h1 className="text-4xl font-semibold tracking-tight">Low-cost MP3 transcription</h1>
        <p className="max-w-3xl text-muted-foreground">
          Upload an MP3, monitor its Transcribe status, and export a readable speaker-labeled transcript once processing completes.
        </p>
      </header>

      <UploadDropzone onUploaded={() => loadJobs()} />

      <JobTable
        jobs={sortedJobs}
        nextCursor={nextCursor}
        onDelete={handleDelete}
        onLoadMore={() => loadJobs(nextCursor ?? undefined)}
        onSort={handleSort}
        sortDirection={sortDirection}
        sortKey={sortKey}
      />
    </div>
  );
}

function compareJobs(
  left: JobSummary,
  right: JobSummary,
  sortKey: JobSortKey,
  sortDirection: "asc" | "desc",
) {
  const modifier = sortDirection === "asc" ? 1 : -1;

  if (sortKey === "fileName" || sortKey === "status") {
    return left[sortKey].localeCompare(right[sortKey]) * modifier;
  }

  if (sortKey === "durationSeconds") {
    return (left.durationSeconds - right.durationSeconds) * modifier;
  }

  return (
    (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * modifier
  );
}
