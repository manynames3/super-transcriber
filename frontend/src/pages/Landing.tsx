import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Database,
  Download,
  FileAudio2,
  FileCode2,
  FileText,
  FolderLock,
  LockKeyhole,
  Menu,
  Scale,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/authStore";
import { Button, buttonVariants } from "../components/ui/button";

interface PricingPlan {
  badge?: string;
  ctaClassName: string;
  ctaLabel: string;
  ctaType: "hosted" | "sales";
  featured?: boolean;
  name: string;
  period?: string;
  price: string;
  pricePrefix?: string;
  tagline: string;
  tierClassName: string;
  tierTone: "starter" | "pro" | "private";
  features: string[];
}

const trustSignals = [
  {
    label: "No meeting bot",
    value: "Files are uploaded intentionally, not captured silently from calendars or calls.",
  },
  {
    label: "Defined retention",
    value: "Uploads expire after 3 days. Transcript artifacts expire after 90 days.",
  },
  {
    label: "AWS primitives",
    value: "Cognito, S3, Lambda, DynamoDB, EventBridge, and Amazon Transcribe.",
  },
  {
    label: "Private deployment path",
    value: "The same stack can be deployed into a customer-owned AWS account.",
  },
];

const privacyPillars = [
  {
    description:
      "The workflow is explicit upload, direct-to-S3 storage, and authenticated retrieval. There is no vendor-controlled meeting recorder joining calls behind the scenes.",
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "No third-party meeting bot",
  },
  {
    description:
      "The repo already uses private S3 buckets, Cognito auth, and a Terraform-managed AWS stack, which makes customer-owned deployments a credible product option rather than hand-wavy enterprise copy.",
    icon: <LockKeyhole className="h-5 w-5" />,
    title: "Customer-owned deployment boundary",
  },
  {
    description:
      "Retention is implemented with actual lifecycle rules, soft-delete job history, and transcript job audit events, so the product can talk about data handling in concrete terms instead of vague privacy promises.",
    icon: <Database className="h-5 w-5" />,
    title: "Retention is policy, not marketing",
  },
  {
    description:
      "The strongest fit is sensitive audio: legal intake, HR interviews, internal strategy, board reviews, and pre-release media that should not be tossed into a generic AI chat.",
    icon: <Scale className="h-5 w-5" />,
    title: "Built for sensitive workflows",
  },
];

const outcomePoints = [
  {
    description:
      "Review witness interviews, intake calls, and deposition prep audio without forwarding case material into a generic chat workflow.",
    icon: <Scale className="h-5 w-5" />,
    title: "Legal and investigations",
  },
  {
    description:
      "Handle performance reviews, investigation interviews, and manager notes with clearer retention windows and authenticated access.",
    icon: <Users className="h-5 w-5" />,
    title: "HR and people operations",
  },
  {
    description:
      "Keep internal briefings, board prep, and strategy calls in a controlled workflow with transcript exports that are easy to circulate.",
    icon: <Building2 className="h-5 w-5" />,
    title: "Finance and internal strategy",
  },
  {
    description:
      "Process podcast rough cuts, voicemail attachments, and pre-release media without relying on a chat UI that may or may not handle real-world files cleanly.",
    icon: <FolderLock className="h-5 w-5" />,
    title: "Studios and creators",
  },
];

const deploymentModes = [
  {
    description:
      "Fastest path for individual users and small teams. The managed product gives you auth, upload, transcript history, and export without infra work.",
    eyebrow: "Hosted workspace",
    title: "Start as a self-serve subscription",
  },
  {
    description:
      "Keep the same UI and workflow, but package it as an internal tool for recurring teams that need a clearer security and retention story than a generic transcription site.",
    eyebrow: "Team plan",
    title: "Upgrade into a governed workspace",
  },
  {
    description:
      "Deploy the Terraform stack into the customer's AWS account so their user pool, buckets, and job metadata live inside their environment instead of a vendor-owned one.",
    eyebrow: "Private deployment",
    title: "Move the data boundary into customer AWS",
  },
];

const pricingPlans: PricingPlan[] = [
  {
    ctaClassName: "bg-secondary text-secondary-foreground hover:bg-white/10",
    ctaLabel: "Start hosted free",
    ctaType: "hosted",
    name: "Starter",
    period: "/month",
    price: "0",
    pricePrefix: "$",
    tagline: "Hosted workspace for proving the workflow before you commit to recurring usage or private deployment.",
    tierClassName: "bg-white/6 text-muted-foreground",
    tierTone: "starter",
    features: [
      "3 transcripts per month",
      "MP3 and M4A uploads",
      "Speaker-labeled transcript view",
      "Copy + .txt export",
      "Job history dashboard",
    ],
  },
  {
    badge: "Most practical",
    ctaClassName:
      "bg-primary text-primary-foreground shadow-[0_0_40px_rgba(212,168,67,0.22)] hover:-translate-y-0.5 hover:bg-[#e0b34e]",
    ctaLabel: "Upgrade to Pro",
    ctaType: "hosted",
    featured: true,
    name: "Pro",
    period: "/month",
    price: "29",
    pricePrefix: "$",
    tagline: "For recurring transcription work where you want a clean hosted product now without giving up the private-deployment upgrade path later.",
    tierClassName: "bg-[rgba(212,168,67,0.12)] text-primary",
    tierTone: "pro",
    features: [
      "25 transcripts per month",
      "Up to 20 minutes per file",
      "Speaker diarization",
      "Copy + .txt + .json export",
      "Transcript job audit trail",
      "Priority processing + email support",
    ],
  },
  {
    ctaClassName:
      "border border-[rgba(124,106,247,0.3)] bg-[rgba(124,106,247,0.12)] text-[rgb(182,170,255)] hover:bg-[rgba(124,106,247,0.18)]",
    ctaLabel: "Talk to sales",
    ctaType: "sales",
    name: "Private Deployment",
    price: "Custom",
    tagline: "For legal, HR, finance, and internal teams that want the stack deployed into their own AWS account and governed like internal infrastructure.",
    tierClassName: "bg-[rgba(124,106,247,0.12)] text-[rgb(182,170,255)]",
    tierTone: "private",
    features: [
      "Customer-owned AWS account",
      "Customer Cognito user pool",
      "Private S3 + DynamoDB data path",
      "Audit trail on job detail pages",
      "Terraform deployment package",
      "Implementation and upgrade support",
    ],
  },
];

const comparisonRows = [
  ["Delivery model", "Hosted", "Hosted", "Customer AWS account"],
  ["Primary buyer", "Individuals", "Recurring teams", "Private or regulated teams"],
  ["Monthly transcripts", "3", "25", "Contract-based"],
  ["Source file support", "MP3, M4A", "MP3, M4A", "MP3, M4A"],
  ["Speaker diarization", "2-speaker default", "2-speaker default", "2-speaker default"],
  ["TXT export", "Yes", "Yes", "Yes"],
  ["Raw JSON export", "No", "Yes", "Yes"],
  ["Job audit trail", "Basic", "Visible in transcript view", "Visible in customer AWS data store"],
  ["Identity boundary", "Managed Cognito", "Managed Cognito", "Customer Cognito user pool"],
  ["Retention controls", "Managed defaults", "Managed defaults", "Customer lifecycle policy"],
  ["Deployment artifact", "No", "No", "Terraform + Lambda packaging flow"],
];

const faqs = [
  {
    answer:
      "General AI chat UIs are fine for lightweight text tasks, but real audio files often fail at the exact points that matter: file reading, sandbox restrictions, external model access, and opaque tool routing. This product exists to make that path deterministic instead of hopeful.",
    question: "Why not just drop the audio into ChatGPT or Claude?",
  },
  {
    answer:
      "Hosted plans run in the managed deployment behind this product. Private Deployment uses the same core stack but deploys it into the customer's AWS account so their buckets, user pool, and job metadata live inside their environment.",
    question: "What changes in the private-deployment edition?",
  },
  {
    answer:
      "For the hosted product, audio is stored in private S3 buckets and retrieved through authenticated routes. For the private-deployment edition, the stack is intended to be deployed into the customer's own AWS account so the storage boundary is theirs.",
    question: "Does a third-party transcription SaaS keep my audio?",
  },
  {
    answer:
      "Yes. The cleanest commercial path is hosted first, private deployment second. Teams can prove the workflow in the hosted product, then move the stack into customer-owned AWS when security or procurement requires it.",
    question: "Can I start hosted and move private later?",
  },
  {
    answer:
      "Today the strongest fit is legal, HR, internal strategy, podcast/media production, and anyone handling sensitive or inconvenient audio that generic chat tools or meeting bots do not handle well.",
    question: "Who is this product really for?",
  },
  {
    answer:
      "Completed transcript pages now include a lightweight audit trail with lifecycle events such as job creation, retry, completion, failure, and soft delete. It is not a compliance system by itself, but it makes the workflow more reviewable than a black-box upload form.",
    question: "Can I see what happened to a transcript job?",
  },
  {
    answer:
      "The current implementation deletes source uploads after 3 days and transcript artifacts after 90 days using S3 lifecycle rules. That gives the product an actual retention story instead of a vague promise.",
    question: "What happens to uploads after transcription?",
  },
];

const waveformHeights = [
  30, 45, 28, 60, 42, 75, 38, 55, 70, 35, 65, 48, 80, 42, 60, 38, 50, 72, 44, 58, 35, 68, 45,
  78, 52, 40, 62, 47, 55, 33, 70, 48, 65, 38, 58, 44,
];

export function LandingPage() {
  const session = useAuthStore((state) => state.session);
  const hostedCtaHref = session ? "/dashboard" : "/login";
  const hostedCtaLabel = session ? "Open workspace" : "Start hosted free";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);

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
          <nav className="hidden items-center gap-6 lg:flex">
            <a className="nav-link-premium" href="#how-it-works">
              Workflow
            </a>
            <a className="nav-link-premium" href="#deployment">
              Deployment
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
              {session ? "Workspace" : "Sign in"}
            </Link>
            <Link className={buttonVariants()} to={hostedCtaHref}>
              {hostedCtaLabel}
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
                <MobileNavLink href="#how-it-works" label="Workflow" onClick={() => setMobileMenuOpen(false)} />
                <MobileNavLink href="#deployment" label="Deployment" onClick={() => setMobileMenuOpen(false)} />
                <MobileNavLink href="#pricing" label="Pricing" onClick={() => setMobileMenuOpen(false)} />
                <MobileNavLink href="#faq" label="FAQ" onClick={() => setMobileMenuOpen(false)} />
                <Link
                  className="nav-link-premium rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                  to={session ? "/dashboard" : "/login"}
                >
                  {session ? "Workspace" : "Sign in"}
                </Link>
                <Link
                  className={cn(buttonVariants(), "mt-2 w-full")}
                  onClick={() => setMobileMenuOpen(false)}
                  to={hostedCtaHref}
                >
                  {hostedCtaLabel}
                </Link>
              </nav>
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative z-10" id="top">
        <section className="mx-auto max-w-7xl px-6 pb-12 pt-6 md:pb-16 md:pt-8">
          <div className="grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
            <div className="text-center lg:text-left">
              <div className="hero-kicker mb-4">
                <span className="hero-dot" />
                Hosted transcription now. Private deployment when policy requires it.
              </div>
              <h1 className="hero-title max-w-5xl lg:max-w-none">
                Transcription that can
                <br />
                <em>stay inside AWS</em>
                <br />
                instead of a generic AI chat.
              </h1>
              <p className="hero-copy mt-5 text-center lg:text-left">
                Upload MP3 or M4A audio, get a speaker-labeled transcript, and keep a clear storage,
                retention, and deployment story. Start as a hosted subscription. Move the same stack
                into customer-owned AWS when security or procurement asks for it.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to={hostedCtaHref}>
                  {hostedCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-8")}
                  href="#deployment"
                >
                  Explore private deployment
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground md:text-sm lg:justify-start">
                <span>No meeting bot</span>
                <div className="hidden h-4 w-px bg-white/15 sm:block" />
                <span>Explicit upload workflow</span>
                <div className="hidden h-4 w-px bg-white/15 sm:block" />
                <span>Private deployment path</span>
              </div>
            </div>

            <div className="panel glass-line rounded-[24px] p-5 md:p-7">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(212,168,67,0.2)] bg-[rgba(212,168,67,0.1)] text-primary">
                    <FileAudio2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">board-review.m4a</div>
                    <div className="text-xs text-muted-foreground">6:14 · 11.8 MB</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Completed
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <MetaChip label="Storage" value="Private S3 buckets" />
                <MetaChip label="Identity" value="Cognito auth" />
                <MetaChip label="Retention" value="3d / 90d lifecycle" />
              </div>

              <div className="mb-4 flex h-12 items-center gap-1 md:h-14">
                {waveformHeights.map((height, index) => (
                  <div
                    className={cn(
                      "flex-1 rounded-sm bg-white/8",
                      index < 16 && "bg-primary shadow-[0_0_18px_rgba(212,168,67,0.18)]",
                    )}
                    key={index}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <div className="rounded-[18px] border border-white/8 bg-[rgba(28,28,38,0.9)] p-4 font-mono text-[13px] leading-7 text-muted-foreground md:p-5 md:text-sm">
                <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[rgba(255,255,255,0.32)]">
                  Transcript
                </div>
                <p>
                  <span className="text-primary">[Speaker 1]:</span> Keep the workflow simple. The
                  team needs a usable transcript, but the file should stay in a system with a clear
                  storage and retention story.
                </p>
                <p className="mt-4">
                  <span className="text-[rgb(154,139,255)]">[Speaker 2]:</span> Right, and if
                  policy changes later, we should be able to move the stack into the customer&apos;s
                  AWS account without redesigning the product.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <MarketingAction icon={<Copy className="h-3.5 w-3.5" />} label="Copy text" />
                <MarketingAction icon={<Download className="h-3.5 w-3.5" />} label="Download .txt" />
                <MarketingAction icon={<FileCode2 className="h-3.5 w-3.5" />} label="Download .json" />
                <span className="ml-auto text-xs text-muted-foreground max-md:w-full max-md:pt-2">
                  1,128 words · 6 min read
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-12 md:grid-cols-2 md:pb-16 xl:grid-cols-4">
          {trustSignals.map((signal) => (
            <div className="panel-soft rounded-[20px] p-5" key={signal.label}>
              <div className="text-[11px] uppercase tracking-[0.16em] text-primary">{signal.label}</div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{signal.value}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20" id="how-it-works">
          <div className="section-label">Workflow</div>
          <h2 className="hero-title mt-3 max-w-[12ch] text-[30px] leading-[1.02] md:mt-4 md:max-w-4xl md:text-6xl">
            Explicit upload,
            <em> deterministic output.</em>
          </h2>
          <p className="hero-copy mt-4 max-w-xl md:mt-5 md:max-w-2xl">
            The workflow is intentionally boring in the best possible way: pick a file, validate it
            in the browser, send it through a known AWS pipeline, and get back transcript artifacts
            you can actually use.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-[22px] border border-white/8 bg-white/8 md:mt-12 lg:mt-16 lg:grid-cols-3">
            <StepCard
              description="Choose an MP3 or M4A file. The browser validates file header bytes, size, and duration before any network call."
              icon={<UploadGlyph />}
              number="01"
              title="Validate in the client"
            />
            <StepCard
              description="Upload directly to S3, then start an async Amazon Transcribe job through authenticated API routes backed by Lambda and DynamoDB."
              icon={<Clock3 className="h-5 w-5" />}
              number="02"
              title="Process through AWS"
            />
            <StepCard
              description="Review speaker-labeled text, copy it, export it, or revisit it from the dashboard until lifecycle retention removes the artifacts."
              icon={<FileText className="h-5 w-5" />}
              number="03"
              title="Export under defined retention"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <div className="section-label">Privacy-first by design</div>
          <h2 className="hero-title mt-3 max-w-[12ch] text-[30px] leading-[1.02] md:mt-4 md:max-w-5xl md:text-6xl">
            Sell the
            <em> absence of vendor risk.</em>
          </h2>

          <div className="mt-8 grid gap-4 md:mt-12 md:gap-6 lg:mt-16 lg:grid-cols-2">
            {privacyPillars.map((pillar) => (
              <FeatureCard
                description={pillar.description}
                icon={pillar.icon}
                key={pillar.title}
                title={pillar.title}
              />
            ))}
          </div>
        </section>

        <section className="border-y border-white/8 bg-[rgba(19,19,26,0.92)] px-6 py-14 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="section-label">Where this stands out</div>
              <h2 className="hero-title mt-3 max-w-[12ch] text-[30px] leading-[1.02] md:mt-4 md:max-w-4xl md:text-6xl">
                Built for teams that
                <em> cannot shrug at the data boundary.</em>
              </h2>
              <p className="hero-copy mt-5 max-w-xl">
                Generic transcription sites compete on summaries, chat, and integrations. This
                product can compete on a cleaner storage path, a deployable AWS stack, and a more
                credible story for sensitive audio.
              </p>
              <a
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8 px-8")}
                href="mailto:hello@supertranscriber.com?subject=Private%20Deployment%20Inquiry"
              >
                Discuss a private deployment
              </a>
            </div>
            <div className="grid gap-4">
              {outcomePoints.map((point) => (
                <div className="panel-soft rounded-[22px] p-5 md:p-6" key={point.title}>
                  <div className="flex items-start gap-4">
                    <FeatureCardIcon icon={point.icon} />
                    <div>
                      <h3 className="text-lg font-medium tracking-[-0.02em] text-foreground">{point.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-20" id="deployment">
          <div className="section-label">Deployment models</div>
          <h2 className="hero-title mt-3 max-w-[13ch] text-[30px] leading-[1.02] md:mt-4 md:max-w-5xl md:text-6xl">
            Start hosted.
            <em> Move private when policy requires it.</em>
          </h2>
          <p className="hero-copy mt-4 max-w-xl md:mt-5 md:max-w-3xl">
            The commercial ladder matters as much as the tech. The same product can be sold as a
            self-serve subscription, a governed team workspace, or a private deployment living in a
            customer-owned AWS account.
          </p>

          <div className="mt-8 grid gap-4 md:mt-12 md:gap-6 lg:grid-cols-3">
            {deploymentModes.map((mode) => (
              <div className="panel rounded-[24px] p-6 md:p-8" key={mode.title}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-primary">{mode.eyebrow}</div>
                <h3 className="mt-4 text-2xl font-medium tracking-[-0.03em] text-foreground">{mode.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{mode.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/8 bg-[rgba(19,19,26,0.92)] px-6 py-20" id="pricing">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="section-label">Pricing</div>
              <h2 className="hero-title mt-4 text-4xl md:text-6xl">
                Hosted subscription,
                <br />
                <em> enterprise upgrade path.</em>
              </h2>
              <p className="hero-copy mx-auto mt-5 text-center">
                The subscription is the easy entry point. The enterprise story is the data boundary:
                keep the hosted product for speed, or move the same stack into customer-owned AWS
                when that becomes the blocking requirement.
              </p>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {pricingPlans.map((plan) => (
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
                  <div className="mt-5 flex items-end gap-1">
                    {plan.pricePrefix ? <span className="pb-2 text-xl text-muted-foreground">{plan.pricePrefix}</span> : null}
                    <span
                      className={cn(
                        "leading-none tracking-[-0.04em] text-foreground",
                        plan.price === "Custom" ? "text-4xl font-medium md:text-5xl" : "font-serif text-6xl",
                      )}
                    >
                      {plan.price}
                    </span>
                    {plan.period ? <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span> : null}
                  </div>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-muted-foreground">{plan.tagline}</p>
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
                  {plan.ctaType === "hosted" ? (
                    <Link
                      className={cn("mt-8 block rounded-[10px] px-5 py-3 text-center text-sm font-medium", plan.ctaClassName)}
                      to={hostedCtaHref}
                    >
                      {plan.ctaLabel}
                    </Link>
                  ) : (
                    <a
                      className={cn("mt-8 block rounded-[10px] px-5 py-3 text-center text-sm font-medium", plan.ctaClassName)}
                      href="mailto:hello@supertranscriber.com?subject=Private%20Deployment%20Inquiry"
                    >
                      {plan.ctaLabel}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              Hosted plans are optimized for self-serve adoption. Private Deployment is the upgrade
              path for teams that want customer-owned storage, identity, and retention controls.{" "}
              <a className="text-foreground underline decoration-white/20 underline-offset-4" href="mailto:hello@supertranscriber.com">
                hello@supertranscriber.com
              </a>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="section-label">Compare</div>
          <h2 className="hero-title mt-4 text-4xl md:text-6xl">
            Hosted and private,
            <br />
            <em> side by side.</em>
          </h2>

          <div className="mt-12 overflow-hidden rounded-[24px] border border-white/8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.02)]">
                  <th className="px-5 py-4 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Feature</th>
                  <th className="px-5 py-4 text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Starter</th>
                  <th className="px-5 py-4 text-center text-[11px] uppercase tracking-[0.12em] text-primary">Pro</th>
                  <th className="px-5 py-4 text-center text-[11px] uppercase tracking-[0.12em] text-[rgb(182,170,255)]">Private</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([label, starter, pro, enterprise]) => (
                  <tr className="border-t border-white/8 hover:bg-white/[0.02]" key={label}>
                    <td className="px-5 py-4 text-foreground">{label}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground">{starter}</td>
                    <td className="px-5 py-4 text-center text-primary">{pro}</td>
                    <td className="px-5 py-4 text-center text-[rgb(182,170,255)]">{enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20" id="faq">
          <div className="section-label">FAQ</div>
          <h2 className="hero-title mt-4 text-4xl md:text-6xl">
            Questions about the
            <br />
            <em> hosted and private models.</em>
          </h2>

          <div className="mt-12 rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.02)]">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div className="border-b border-white/8 last:border-b-0" key={faq.question}>
                  <button
                    className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left md:px-7 md:py-6"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                    type="button"
                  >
                    <span className="text-lg font-medium tracking-[-0.02em] text-foreground md:text-[22px]">
                      {faq.question}
                    </span>
                    <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen ? (
                    <div className="px-5 pb-5 pr-10 text-sm leading-7 text-muted-foreground md:px-7 md:pb-6 md:pr-16">
                      {faq.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-6 mb-20 rounded-[28px] border border-[rgba(212,168,67,0.2)] bg-[rgba(19,19,26,0.96)] px-6 py-16 text-center md:px-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="hero-title text-4xl md:text-6xl">
              Start as a subscription.
              <br />
              <em> Upgrade the deployment boundary later.</em>
            </h2>
            <p className="hero-copy mx-auto mt-5 text-center">
              That is the whole point of the v2 positioning. The public product can win on speed and
              usability now, then grow into a private-deployment offer for teams that care where the
              audio, transcripts, and identity layer live.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to={hostedCtaHref}>
                {hostedCtaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-8")}
                href="mailto:hello@supertranscriber.com?subject=Private%20Deployment%20Inquiry"
              >
                Ask about private deployment
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-t border-white/8 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>©2026 SUPREME AI VENTURES LLC</div>
        <div className="flex flex-wrap gap-6">
          <a className="hover:text-foreground" href="#deployment">
            Deployment
          </a>
          <a className="hover:text-foreground" href="#pricing">
            Pricing
          </a>
          <a className="hover:text-foreground" href="#faq">
            FAQ
          </a>
          <Link className="hover:text-foreground" to={session ? "/dashboard" : "/login"}>
            {session ? "Workspace" : "Sign in"}
          </Link>
          <a className="hover:text-foreground" href="mailto:hello@supertranscriber.com">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}

function MobileNavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      className="nav-link-premium rounded-[12px] border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-foreground"
      href={href}
      onClick={onClick}
    >
      {label}
    </a>
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

function MetaChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[rgba(240,237,232,0.7)]">
      <BadgeCheck className="h-3.5 w-3.5 text-primary" />
      <span className="text-[rgba(255,255,255,0.4)]">{label}</span>
      <span className="text-foreground">{value}</span>
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
