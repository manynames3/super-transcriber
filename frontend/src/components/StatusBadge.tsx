import { Badge } from "./ui/badge";

export function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "FAILED") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (status === "IN_PROGRESS") {
    return <Badge variant="warning">In Progress</Badge>;
  }

  return <Badge>Pending</Badge>;
}
