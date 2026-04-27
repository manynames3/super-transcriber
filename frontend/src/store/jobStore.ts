import { create } from "zustand";
import type { JobSummary } from "../types";

export type JobSortKey = "createdAt" | "durationSeconds" | "fileName" | "status";
export type JobSortDirection = "asc" | "desc";

interface JobState {
  isLoading: boolean;
  jobs: JobSummary[];
  nextCursor: string | null;
  sortDirection: JobSortDirection;
  sortKey: JobSortKey;
  uploadProgress: number;
  appendJobs: (jobs: JobSummary[], nextCursor: string | null) => void;
  resetJobs: () => void;
  setJobs: (jobs: JobSummary[], nextCursor: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setSort: (sortKey: JobSortKey) => void;
  setUploadProgress: (value: number) => void;
  updateJob: (job: JobSummary) => void;
}

export const useJobStore = create<JobState>((set) => ({
  isLoading: false,
  jobs: [],
  nextCursor: null,
  sortDirection: "desc",
  sortKey: "createdAt",
  uploadProgress: 0,
  appendJobs: (jobs, nextCursor) =>
    set((state) => ({
      jobs: dedupeJobs([...state.jobs, ...jobs]),
      nextCursor,
    })),
  resetJobs: () =>
    set({
      jobs: [],
      nextCursor: null,
      uploadProgress: 0,
    }),
  setJobs: (jobs, nextCursor) =>
    set({
      jobs,
      nextCursor,
    }),
  setLoading: (isLoading) =>
    set({
      isLoading,
    }),
  setSort: (sortKey) =>
    set((state) => ({
      sortDirection:
        state.sortKey === sortKey && state.sortDirection === "desc" ? "asc" : "desc",
      sortKey,
    })),
  setUploadProgress: (value) =>
    set({
      uploadProgress: value,
    }),
  updateJob: (job) =>
    set((state) => ({
      jobs: dedupeJobs(state.jobs.map((current) => (current.jobId === job.jobId ? job : current)).concat(
        state.jobs.some((current) => current.jobId === job.jobId) ? [] : [job],
      )),
    })),
}));

function dedupeJobs(jobs: JobSummary[]) {
  const map = new Map<string, JobSummary>();
  for (const job of jobs) {
    map.set(job.jobId, job);
  }
  return Array.from(map.values());
}
