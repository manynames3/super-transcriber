import { cn } from "../lib/utils";

interface ProgressBarProps {
  className?: string;
  value: number;
}

export function ProgressBar({ className, value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-secondary/60", className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
