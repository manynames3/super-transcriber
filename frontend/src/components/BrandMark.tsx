import { AudioWaveform } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_0_32px_rgba(212,168,67,0.24)]">
        <AudioWaveform className="h-4 w-4" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="nav-wordmark">Super Transcriber</span>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-[rgba(240,237,232,0.38)] md:inline-flex">
          AI
        </span>
      </div>
    </div>
  );
}
