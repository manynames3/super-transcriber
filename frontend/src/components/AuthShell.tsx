import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  subtitle: string;
  title: ReactNode;
}

export function AuthShell({ children, eyebrow, subtitle, title }: AuthShellProps) {
  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="chrome-nav">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Link to="/login">
            <BrandMark />
          </Link>
          <div className="nav-meta">Private AWS transcription workspace</div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-8">
          <div className="hero-kicker">
            <span className="hero-dot" />
            {eyebrow}
          </div>
          <div className="space-y-5">
            <h1 className="hero-title">{title}</h1>
            <p className="hero-copy">{subtitle}</p>
          </div>
          <div className="panel glass-line rounded-[28px] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Sample transcript preview</div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Speaker labels enabled
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[rgba(28,28,38,0.88)] p-4 font-mono text-sm leading-7 text-muted-foreground">
              <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.32)]">Preview</div>
              <p className="mb-2 text-primary">[Speaker 1]:</p>
              <p className="mb-4">Can we get the launch transcript exported before noon?</p>
              <p className="mb-2 text-[rgb(154,139,255)]">[Speaker 2]:</p>
              <p>Yes. The audio file is already queued and the transcript JSON will be copied to storage on completion.</p>
            </div>
          </div>
        </section>
        <section>{children}</section>
      </div>
    </div>
  );
}
