import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
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
    <AppShell>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="space-y-6 pt-4">
          <div className="hero-kicker">
            <span className="hero-dot" />
            Workspace
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div className="space-y-5">
              <h1 className="hero-title">
                Secure audio <em>transcription</em> with a clearer storage story.
              </h1>
              <p className="hero-copy">
                Upload an MP3 or M4A, see the duration before you spend Transcribe minutes, then
                track a speaker-labeled transcript through export and retention-aware job history.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Jobs loaded" value={sortedJobs.length.toString()} />
              <MetricCard
                label="Completed"
                value={sortedJobs.filter((job) => job.status === "COMPLETED").length.toString()}
              />
              <MetricCard
                label="Active"
                value={sortedJobs.filter((job) => job.status === "PENDING" || job.status === "IN_PROGRESS").length.toString()}
              />
            </div>
          </div>
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
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-soft rounded-[20px] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-4xl leading-none tracking-[-0.04em] text-foreground">{value}</p>
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
