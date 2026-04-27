import { ArrowDownUp, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDuration } from "../lib/audio";
import type { JobSummary } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { StatusBadge } from "./StatusBadge";
import type { JobSortKey } from "../store/jobStore";

interface JobTableProps {
  jobs: JobSummary[];
  nextCursor: string | null;
  onDelete: (jobId: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
  onSort: (key: JobSortKey) => void;
  sortDirection: "asc" | "desc";
  sortKey: JobSortKey;
}

export function JobTable({
  jobs,
  nextCursor,
  onDelete,
  onLoadMore,
  onSort,
  sortDirection,
  sortKey,
}: JobTableProps) {
  return (
    <Card className="glass-line">
      <CardHeader className="border-b border-white/8 bg-transparent">
        <CardTitle>Job history</CardTitle>
        <CardDescription>Sorted client-side with cursor pagination from DynamoDB.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead active={sortKey === "fileName"} direction={sortDirection} onClick={() => onSort("fileName")}>
                  File name
                </SortableHead>
                <SortableHead active={sortKey === "createdAt"} direction={sortDirection} onClick={() => onSort("createdAt")}>
                  Date
                </SortableHead>
                <SortableHead active={sortKey === "status"} direction={sortDirection} onClick={() => onSort("status")}>
                  Status
                </SortableHead>
                <SortableHead
                  active={sortKey === "durationSeconds"}
                  direction={sortDirection}
                  onClick={() => onSort("durationSeconds")}
                >
                  Duration
                </SortableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    No transcription jobs yet.
                  </TableCell>
                </TableRow>
              ) : null}

              {jobs.map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell className="font-medium">{job.fileName}</TableCell>
                  <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>{formatDuration(job.durationSeconds)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/15 bg-white/[0.02] px-4 text-sm font-medium text-foreground hover:bg-white/[0.06] hover:border-white/25"
                        to={`/transcript/${job.jobId}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </Link>
                      <Button
                        onClick={() => void onDelete(job.jobId)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {nextCursor ? (
          <div className="flex justify-end">
            <Button onClick={() => void onLoadMore()} variant="secondary">
              Load more
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SortableHead({
  active,
  children,
  direction,
  onClick,
}: {
  active: boolean;
  children: string;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button className="inline-flex items-center gap-2 hover:text-foreground" onClick={onClick} type="button">
        {children}
        <ArrowDownUp className={`h-4 w-4 ${active ? "opacity-100" : "opacity-40"}`} />
        {active ? <span className="text-xs uppercase">{direction}</span> : null}
      </button>
    </TableHead>
  );
}
