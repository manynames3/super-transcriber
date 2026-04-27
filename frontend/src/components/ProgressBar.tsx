import { cn } from "../lib/utils";

interface ProgressBarProps {
  className?: string;
  value: number;
}

export function ProgressBar({ className, value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-white/8", className)}>
      <div
        className="h-full rounded-full bg-primary shadow-[0_0_22px_rgba(212,168,67,0.25)] transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
