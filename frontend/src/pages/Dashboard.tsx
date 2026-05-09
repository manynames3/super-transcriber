import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { apiRequest } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useJobStore, type JobSortKey } from "../store/jobStore";
import type { BillingStatus, JobSummary } from "../types";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
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
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

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

  const loadBilling = async () => {
    try {
      setBillingError(null);
      const response = await apiRequest<BillingStatus>("/billing/status");
      setBilling(response);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to load billing status.");
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadJobs();
    void loadBilling();
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

  const handleUpgrade = async () => {
    try {
      setIsStartingCheckout(true);
      setBillingError(null);
      const response = await apiRequest<{ checkoutUrl: string }>("/billing/checkout", {
        body: JSON.stringify({ plan: "pro" }),
        method: "POST",
      });
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setIsStartingCheckout(false);
    }
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

        <BillingCard
          billing={billing}
          error={billingError}
          isStartingCheckout={isStartingCheckout}
          onUpgrade={() => void handleUpgrade()}
        />

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

function BillingCard({
  billing,
  error,
  isStartingCheckout,
  onUpgrade,
}: {
  billing: BillingStatus | null;
  error: string | null;
  isStartingCheckout: boolean;
  onUpgrade: () => void;
}) {
  const transcriptLimit = billing?.limits.monthlyTranscriptLimit ?? 3;
  const transcriptsUsed = billing?.transcriptsUsed ?? 0;
  const usagePercent = Math.min(100, Math.round((transcriptsUsed / transcriptLimit) * 100));

  return (
    <Card className="glass-line">
      <CardHeader className="border-b border-white/8 bg-transparent">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Plan and usage</CardTitle>
            <CardDescription>
              Subscription limits are enforced before Transcribe starts, so cost stays predictable.
            </CardDescription>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            {billing?.limits.label ?? "Starter"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Period" value={billing?.usagePeriod ?? "Loading"} />
          <MetricCard label="Transcripts used" value={`${transcriptsUsed}/${transcriptLimit}`} />
          <MetricCard
            label="Max file length"
            value={`${Math.round((billing?.limits.maxDurationSeconds ?? 300) / 60)} min`}
          />
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usagePercent}%` }} />
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {billing?.plan === "pro" || billing?.plan === "private" ? (
          <p className="text-sm text-muted-foreground">
            Your account is on {billing.limits.label}. Status: {billing.subscriptionStatus}.
          </p>
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Starter includes 3 transcripts/month and 5-minute files. Upgrade for 25 transcripts/month and 20-minute files.
            </p>
            <Button disabled={isStartingCheckout} onClick={onUpgrade}>
              {isStartingCheckout ? "Opening checkout" : "Upgrade to Pro"}
            </Button>
          </div>
        )}

        {billing && !billing.stripeConfigured ? (
          <p className="text-xs text-muted-foreground">
            Stripe checkout is not configured yet. Free-plan enforcement is active; add Stripe secrets and a Pro price ID to enable paid upgrades.
          </p>
        ) : null}
      </CardContent>
    </Card>
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
