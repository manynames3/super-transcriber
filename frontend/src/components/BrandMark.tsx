import { AudioWaveform } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_0_32px_rgba(212,168,67,0.24)]">
        <AudioWaveform className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium tracking-[-0.02em] text-foreground">Super Transcriber</span>
    </div>
  );
}
