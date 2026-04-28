import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileAudio2,
  FileCode2,
  FileText,
  History,
  Menu,
  Shield,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { Button, buttonVariants } from "../components/ui/button";
import { useAuthStore } from "../store/authStore";
import { cn } from "../lib/utils";

const plans = [
  {
    badge: null,
    ctaClassName: "bg-secondary text-secondary-foreground hover:bg-white/10",
    ctaLabel: "Get started free",
    name: "Free",
    period: "/month",
    price: "0",
    tagline: "For occasional use. No card required and no account expiration.",
    tierClassName: "bg-white/6 text-muted-foreground",
    tierTone: "free" as const,
    features: [
      "3 transcripts per month",
      "Up to 5 minutes audio length",
      "Speaker diarization",
      "Copy + .txt download",
      "Job history dashboard",
    ],
  },
  {
    badge: "Most popular",
    ctaClassName:
      "bg-primary text-primary-foreground shadow-[0_0_40px_rgba(212,168,67,0.22)] hover:-translate-y-0.5 hover:bg-[#e0b34e]",
    ctaLabel: "Upgrade to Pro",
    featured: true,
    name: "Pro",
    period: "/month",
    price: "10",
    tagline: "For journalists, researchers, creators, and small teams using transcription weekly.",
    tierClassName: "bg-[rgba(212,168,67,0.12)] text-primary",
    tierTone: "pro" as const,
    features: [
      "10 transcripts per month",
      "Up to 10 minutes audio length",
      "Speaker diarization",
      "Copy + .txt + .json download",
      "Priority processing queue",
      "Email support",
    ],
  },
  {
    badge: null,
    ctaClassName:
      "border border-[rgba(124,106,247,0.25)] bg-[rgba(124,106,247,0.12)] text-[rgb(154,139,255)] hover:bg-[rgba(124,106,247,0.18)]",
    ctaLabel: "Get Max",
    name: "Max",
    period: "/month",
    price: "25",
    tagline: "For long-form content and teams running transcription constantly.",
    tierClassName: "bg-[rgba(124,106,247,0.12)] text-[rgb(154,139,255)]",
    tierTone: "max" as const,
    features: [
      "25 transcripts per month",
      "Up to 20 minutes audio length",
      "Speaker diarization",
      "Copy + .txt + .json download",
      "Priority processing queue",
      "Priority email support",
    ],
  },
];

const comparisonRows = [
  ["Monthly transcripts", "3", "10", "25"],
  ["Max audio length", "5 min", "10 min", "20 min"],
  ["Speaker diarization", "✓", "✓", "✓"],
  ["Copy to clipboard", "✓", "✓", "✓"],
  ["Download .txt", "✓", "✓", "✓"],
  ["Download raw .json", "—", "✓", "✓"],
  ["Job history dashboard", "✓", "✓", "✓"],
  ["Priority processing", "—", "✓", "✓"],
  ["Email support", "—", "✓", "✓"],
  ["Credit card required", "No", "Yes", "Yes"],
];

const faqs = [
  {
    answer:
      "Currently MP3 files only. WAV, M4A, and MP4 audio-track support can be added later without changing the current backend flow.",
    question: "What audio formats do you support?",
  },
  {
    answer:
      "Amazon Transcribe typically lands around 95–97% word accuracy on clear recordings. Crosstalk, poor mic quality, and heavy background noise reduce that.",
    question: "How accurate is the transcription?",
  },
  {
    answer:
      "Most files complete in under two minutes. The transcript screen polls automatically and stops as soon as the job reaches a terminal state.",
    question: "How long does transcription take?",
  },
  {
    answer:
      "We use Amazon Transcribe speaker diarization with two speaker labels enabled by default, which works best for interviews and turn-based conversations.",
    question: "How does speaker detection work?",
  },
  {
    answer:
      "The original MP3 is automatically deleted after 3 days. Transcript JSON is retained for 90 days and remains accessible from the dashboard during that window.",
    question: "Do my uploads expire?",
  },
  {
    answer:
      "Yes. The pricing presentation is set up like a live SaaS product, and the plan tiers can map cleanly to future quota enforcement without redesigning the page.",
    question: "Can I upgrade or cancel later?",
  },
  {
    answer:
      "Audio and transcript artifacts are stored in private S3 buckets, access is authenticated through Cognito JWTs, and the app does not use public object reads.",
    question: "Is my data private?",
  },
  {
    answer:
      "The raw JSON contains the full Amazon Transcribe payload, including timestamps, confidence scores, punctuation, and word-level speaker labels.",
    question: "What is the raw .json download for?",
  },
];

const waveformHeights = [30, 45, 28, 60, 42, 75, 38, 55, 70, 35, 65, 48, 80, 42, 60, 38, 50, 72, 44, 58, 35, 68, 45, 78, 52, 40, 62, 47, 55, 33, 70, 48, 65, 38, 58, 44];

export function LandingPage() {
  const session = useAuthStore((state) => state.session);
  const ctaHref = session ? "/dashboard" : "/login";
  const ctaLabel = session ? "Open app" : "Start for free";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="app-shell">
      <header className="chrome-nav">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-6 md:h-16">
          <a href="#top">
            <BrandMark />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a className="nav-link-premium" href="#how-it-works">
              How it works
            </a>
            <a className="nav-link-premium" href="#pricing">
              Pricing
            </a>
            <a className="nav-link-premium" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link className="nav-link-premium" to={session ? "/dashboard" : "/login"}>
              {session ? "Dashboard" : "Sign in"}
            </Link>
            <Link className={buttonVariants()} to={ctaHref}>
              {ctaLabel}
            </Link>
          </div>
          <Button
            aria-controls="mobile-site-nav"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="h-10 w-10 border border-white/10 bg-white/[0.03] p-0 text-foreground hover:bg-white/8 md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            variant="ghost"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {mobileMenuOpen ? (
          <div className="border-t border-white/8 md:hidden" id="mobile-site-nav">
            <div className="mx-auto max-w-7xl px-6 py-4">
              <nav className="flex flex-col gap-2">
                <a
                  className="nav-link-premium rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-foreground"
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How it works
                </a>
                <a
                  className="nav-link-premium rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-foreground"
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <a
                  className="nav-link-premium rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-foreground"
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </a>
                <Link
                  className="nav-link-premium rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                  to={session ? "/dashboard" : "/login"}
                >
                  {session ? "Dashboard" : "Sign in"}
                </Link>
                <Link
                  className={cn(buttonVariants(), "mt-2 w-full")}
                  onClick={() => setMobileMenuOpen(false)}
                  to={ctaHref}
                >
                  {ctaLabel}
                </Link>
              </nav>
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative z-10" id="top">
        <section className="mx-auto max-w-7xl px-6 pb-14 pt-6 md:pb-16 md:pt-8">
          <div className="grid items-center gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-8">
            <div className="text-center lg:text-left">
              <div className="hero-kicker mb-4">
                <span className="hero-dot" />
                Instant audio transcription
              </div>
              <h1 className="hero-title max-w-4xl lg:max-w-none">
                Your words,
                <br />
                <em>on the page</em>
                <br />
                in seconds.
              </h1>
              <p className="hero-copy mt-5 text-center lg:text-left">
                Upload an MP3. Get a clean, speaker-labeled transcript you can copy, download, or share, powered by Amazon&apos;s speech stack and packaged like a real product.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to={ctaHref}>
                  {session ? "Open dashboard" : "Start for free"} →
                </Link>
                <a className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-8")} href="#how-it-works">
                  See how it works
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground md:text-sm lg:justify-start">
                <span>No credit card required</span>
                <div className="hidden h-4 w-px bg-white/15 sm:block" />
                <span>3 free transcripts/month</span>
                <div className="hidden h-4 w-px bg-white/15 sm:block" />
                <span>95%+ accuracy on clear audio</span>
              </div>
            </div>

            <div className="panel glass-line rounded-[24px] p-5 md:p-7">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(212,168,67,0.2)] bg-[rgba(212,168,67,0.1)] text-primary">
                    <FileAudio2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">interview_final.mp3</div>
                    <div className="text-xs text-muted-foreground">4:32 · 8.2 MB</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Completed
                </div>
              </div>

              <div className="mb-4 flex h-12 items-center gap-1 md:h-14">
                {waveformHeights.map((height, index) => (
                  <div
                    className={cn(
                      "flex-1 rounded-sm bg-white/8",
                      index < 14 && "bg-primary shadow-[0_0_18px_rgba(212,168,67,0.18)]",
                    )}
                    key={index}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="rounded-[18px] border border-white/8 bg-[rgba(28,28,38,0.9)] p-4 font-mono text-[13px] leading-7 text-muted-foreground md:p-5 md:text-sm">
                <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.32)]">Transcript</div>
                <p>
                  <span className="text-primary">[Speaker 1]:</span> The key insight from last quarter was that retention improved by nearly 40% once we simplified the onboarding flow.
                </p>
                <p className="mt-4">
                  <span className="text-[rgb(154,139,255)]">[Speaker 2]:</span> Right, and that maps directly to what we saw in the cohort analysis. Users who completed setup in under three minutes had double the 30-day retention.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <MarketingAction icon={<Copy className="h-3.5 w-3.5" />} label="Copy text" />
                <MarketingAction icon={<Download className="h-3.5 w-3.5" />} label="Download .txt" />
                <MarketingAction icon={<FileCode2 className="h-3.5 w-3.5" />} label="Download .json" />
                <span className="ml-auto text-xs text-muted-foreground max-md:w-full max-md:pt-2">841 words · 4 min read</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20" id="how-it-works">
          <div className="section-label">Process</div>
          <h2 className="hero-title mt-3 max-w-[10ch] text-[28px] leading-[1.02] md:mt-4 md:max-w-3xl md:text-6xl">
            Drag, drop,
            <em> done.</em>
          </h2>
          <p className="hero-copy mt-4 max-w-lg md:mt-5 md:max-w-2xl">
            Three steps from audio file to polished transcript. No software to install and no workflow detours.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-[22px] border border-white/8 bg-white/8 md:mt-12 lg:mt-16 lg:grid-cols-3">
            <StepCard
              description="Drag your audio file into the upload zone or click to browse. We show duration and estimated cost before submission."
              icon={<UploadGlyph />}
              number="01"
              title="Upload your MP3"
            />
            <StepCard
              description="Amazon Transcribe analyzes the audio with speaker diarization. Most files finish in under two minutes."
              icon={<Clock3 className="h-5 w-5" />}
              number="02"
              title="We process it"
            />
            <StepCard
              description="Your transcript appears with speaker labels, word count, and export options for copy, .txt, or raw .json."
              icon={<FileText className="h-5 w-5" />}
              number="03"
              title="Copy or download"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="section-label">Features</div>
          <h2 className="hero-title mt-3 max-w-[11ch] text-[28px] leading-[1.02] md:mt-4 md:max-w-4xl md:text-6xl">
            Everything you need,
            <br />
            <em>nothing you don&apos;t.</em>
          </h2>

          <div className="mt-8 grid gap-4 md:mt-12 md:gap-6 lg:mt-16 lg:grid-cols-2">
            <FeatureCard
              description="Powered by Amazon Transcribe, the same speech AI used at enterprise scale. Clear audio regularly exceeds 97% word accuracy."
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="95%+ accuracy"
            />
            <FeatureCard
              description="Automatically detects and labels different speakers in interviews, meetings, and two-person conversations."
              icon={<Users className="h-5 w-5" />}
              title="Speaker diarization"
            />
            <FeatureCard
              description="Download a clean .txt transcript for editorial use or export raw .json with timestamps and confidence data."
              icon={<Download className="h-5 w-5" />}
              title="Multiple export formats"
            />
            <FeatureCard
              description="Every transcript is saved to your dashboard so you can revisit, re-download, or delete jobs without re-uploading."
              icon={<History className="h-5 w-5" />}
              title="Full job history"
            />
            <div className="panel relative overflow-hidden rounded-[24px] border border-[rgba(212,168,67,0.2)] p-5 md:p-8 lg:col-span-2">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,168,67,0.1),transparent_55%)]" />
              <div className="relative grid gap-5 md:gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <FeatureCardIcon icon={<Shield className="h-5 w-5" />} />
                  <h3 className="mt-4 text-xl font-medium tracking-[-0.02em] text-foreground md:mt-5 md:text-2xl">
                    AWS-grade infrastructure, priced for humans
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground md:mt-4 md:text-[15px] md:leading-7">
                    Super Transcriber sits on Amazon Transcribe, S3, Lambda, DynamoDB, and Cognito, but presents them like a clean SaaS offer. The result is a credible monetized product surface with the economics of serverless infrastructure underneath it.
                  </p>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-[rgba(10,10,15,0.9)] p-4 font-mono text-[13px] leading-6 text-muted-foreground md:p-5 md:text-sm md:leading-7">
                  <div>
                    <span className="text-primary">POST</span> /transcribe
                  </div>
                  <div className="text-[rgba(255,255,255,0.35)]">↳ Amazon Transcribe async job</div>
                  <div className="text-[rgba(255,255,255,0.35)]">↳ Speaker diarization: enabled</div>
                  <div className="text-[rgba(255,255,255,0.35)]">↳ Language: en-US</div>
                  <div className="mt-4">
                    <span className="text-emerald-300">STATUS</span> COMPLETED ✓
                  </div>
                  <div className="mt-4 text-[rgb(154,139,255)]">[Speaker 1]:</div>
                  <div>&quot;The Q3 numbers are in, and...&quot;</div>
                  <div className="mt-3 text-primary">[Speaker 2]:</div>
                  <div>&quot;Hold on, let me pull up the deck.&quot;</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-[rgba(19,19,26,0.92)] px-6 py-24" id="pricing">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="section-label">Pricing</div>
              <h2 className="hero-title mt-4 text-4xl md:text-6xl">
                Simple, transparent
                <br />
                <em>pricing.</em>
              </h2>
              <p className="hero-copy mx-auto mt-5 text-center">
                Start free. Upgrade when you need more. The page reads like a live SaaS offer while preserving the current app behavior behind Cognito.
              </p>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  className={cn(
                    "panel relative flex h-full flex-col rounded-[24px] p-8",
                    plan.featured && "scale-[1.02] border-[rgba(212,168,67,0.35)] bg-[rgba(28,28,38,0.98)]",
                  )}
                  key={plan.name}
                >
                  {plan.badge ? (
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground">
                      {plan.badge}
                    </div>
                  ) : null}
                  <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{plan.name}</div>
                  <div className="mt-5 flex items-start gap-1">
                    <span className="pt-2 text-xl text-muted-foreground">$</span>
                    <span className="font-serif text-6xl leading-none tracking-[-0.04em] text-foreground">{plan.price}</span>
                    <span className="self-end pb-1 text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-4 min-h-[48px] text-sm leading-6 text-muted-foreground">{plan.tagline}</p>
                  <div className="my-6 h-px bg-white/8" />
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li className="flex items-start gap-3 text-sm text-muted-foreground" key={feature}>
                        <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-md", plan.tierClassName)}>
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link className={cn("mt-8 block rounded-[10px] px-5 py-3 text-center text-sm font-medium", plan.ctaClassName)} to={ctaHref}>
                    {plan.ctaLabel}
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              All plans include secure accounts, full job history, and no expiring credits. Questions?{" "}
              <a className="text-foreground underline decoration-white/20 underline-offset-4" href="mailto:hello@supertranscriber.com">
                hello@supertranscriber.com
              </a>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="section-label">Compare</div>
          <h2 className="hero-title mt-4 text-4xl md:text-6xl">
            Plan details,
            <br />
            <em>side by side.</em>
          </h2>

          <div className="mt-12 overflow-hidden rounded-[24px] border border-white/8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.02)]">
                  <th className="px-5 py-4 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Feature</th>
                  <th className="px-5 py-4 text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Free</th>
                  <th className="px-5 py-4 text-center text-[11px] uppercase tracking-[0.12em] text-primary">Pro</th>
                  <th className="px-5 py-4 text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Max</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([label, free, pro, max]) => (
                  <tr className="border-t border-white/8 hover:bg-white/[0.02]" key={label}>
                    <td className="px-5 py-4 text-foreground">{label}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground">{free}</td>
                    <td className="px-5 py-4 text-center text-primary">{pro}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground">{max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20" id="faq">
          <div className="section-label">FAQ</div>
          <h2 className="hero-title mt-4 text-4xl md:text-6xl">
            Common <em>questions.</em>
          </h2>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {faqs.map((faq) => (
              <div className="panel rounded-[20px] p-7" key={faq.question}>
                <h3 className="text-base font-medium tracking-[-0.01em] text-foreground">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-6 mb-20 rounded-[28px] border border-[rgba(212,168,67,0.2)] bg-[rgba(19,19,26,0.96)] px-6 py-16 text-center md:px-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="hero-title text-4xl md:text-6xl">
              Ready to stop
              <br />
              <em>transcribing by hand?</em>
            </h2>
            <p className="hero-copy mx-auto mt-5 text-center">
              Join for free. No credit card. Your first 3 transcripts are on us, and the rest of the page already sells the upgrade path like a real SaaS business.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to={ctaHref}>
                {session ? "Open dashboard" : "Start transcribing free"} →
              </Link>
              <a className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-8")} href="#pricing">
                View pricing
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-t border-white/8 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>© 2025 Supreme AI Ventures LLC. Built on AWS.</div>
        <div className="flex flex-wrap gap-6">
          <a className="hover:text-foreground" href="#pricing">
            Pricing
          </a>
          <a className="hover:text-foreground" href="#faq">
            FAQ
          </a>
          <Link className="hover:text-foreground" to={session ? "/dashboard" : "/login"}>
            {session ? "Dashboard" : "Sign in"}
          </Link>
          <a className="hover:text-foreground" href="mailto:hello@supertranscriber.com">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  description,
  icon,
  number,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <div className="bg-[rgba(19,19,26,0.96)] p-5 md:p-8">
      <div className="font-serif text-4xl leading-none tracking-[-0.04em] text-white/15 md:text-5xl">{number}</div>
      <FeatureCardIcon className="mt-4 md:mt-6" icon={icon} />
      <h3 className="mt-4 text-base font-medium tracking-[-0.02em] text-foreground md:mt-5 md:text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground md:mt-3 md:leading-7">{description}</p>
    </div>
  );
}

function FeatureCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="panel relative overflow-hidden rounded-[24px] p-5 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,168,67,0.08),transparent_55%)] opacity-0 transition-opacity duration-300 hover:opacity-100" />
      <div className="relative">
        <FeatureCardIcon icon={icon} />
        <h3 className="mt-4 text-lg font-medium tracking-[-0.02em] text-foreground md:mt-5 md:text-xl">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground md:mt-3 md:leading-7">{description}</p>
      </div>
    </div>
  );
}

function FeatureCardIcon({
  className,
  icon,
}: {
  className?: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[12px] border border-[rgba(212,168,67,0.2)] bg-[rgba(212,168,67,0.1)] text-primary",
        className,
      )}
    >
      {icon}
    </div>
  );
}

function MarketingAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[9px] border border-white/12 bg-white/[0.02] px-3 py-2 text-xs font-medium text-muted-foreground">
      {icon}
      {label}
    </div>
  );
}

function UploadGlyph() {
  return (
    <div className="relative h-5 w-5">
      <Zap className="h-5 w-5" />
    </div>
  );
}
