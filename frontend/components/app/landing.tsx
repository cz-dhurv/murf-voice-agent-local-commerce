'use client';

import {
  BadgeCheck,
  BrainCircuit,
  Clock,
  Code2,
  Github,
  Heart,
  Languages,
  ListChecks,
  MessagesSquare,
  Mic,
  MousePointerClick,
  PhoneCall,
  Play,
  Radio,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
  Wifi,
} from 'lucide-react';
import type { AppConfig } from '@/app-config';
import { DukaanExperience } from '@/components/app/dukaan-experience';
import { useLanguage } from '@/components/app/language-provider';
import { LanguageToggle } from '@/components/app/language-toggle';
import { Button } from '@/components/ui/button';

const REPO_URL = 'https://github.com/cz-dhurv/murf-voice-agent-local-commerce';

type Tr = ReturnType<typeof useLanguage>['tr'];

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cx('mx-auto w-full max-w-6xl px-5 py-16 sm:py-20', className)}>
      {children}
    </section>
  );
}

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="text-muted-foreground mt-3">{sub}</p>
    </div>
  );
}

// ---------------- Nav ----------------
function Nav({ tr, logo }: { tr: Tr; logo: string }) {
  const links = [
    ['#home', tr.navHome],
    ['#how', tr.navHowItWorks],
    ['#features', tr.navFeatures],
    ['#tech', tr.navTechStack],
    ['#impact', tr.navImpact],
    ['#about', tr.navAbout],
  ];
  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <a href="#home" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="DukaanSaathi" className="size-7" />
          <span className="text-lg font-bold tracking-tight">
            Voice for <span className="text-primary">Bharat</span>
          </span>
        </a>
        <div className="text-muted-foreground hidden items-center gap-6 text-sm font-medium lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Github className="size-4" /> {tr.navStar}
            </Button>
          </a>
          <a href="/dashboard">
            <Button size="sm">{tr.navCta}</Button>
          </a>
        </div>
      </nav>
    </header>
  );
}

// ---------------- Hero ----------------
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-primary text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

function Hero({ tr }: { tr: Tr }) {
  return (
    <Section id="home" className="py-12 sm:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="border-primary/20 bg-primary/5 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5" /> {tr.heroBadge}
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            {tr.heroTitle1} <span className="text-primary">{tr.heroTitle2}</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md text-lg leading-7 text-pretty">
            {tr.heroSubtitle}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#widget">
              <Button size="lg" className="gap-2 rounded-full font-semibold shadow-lg">
                <PhoneCall className="size-5" /> {tr.heroCall}
              </Button>
            </a>
            <a href="#how">
              <Button size="lg" variant="outline" className="gap-2 rounded-full font-semibold">
                <Play className="size-4" /> {tr.heroDemo}
              </Button>
            </a>
          </div>
          <div className="mt-8 flex gap-8">
            <Stat value={tr.stat247} label={tr.stat247Sub} />
            <Stat value={tr.statLangs} label={tr.statLangsSub} />
            <Stat value={tr.stat100} label={tr.stat100Sub} />
          </div>
        </div>

        <div id="widget" className="scroll-mt-24">
          <DukaanExperience />
        </div>
      </div>

      {/* mini feature strip */}
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [MessagesSquare, tr.hf1Title, tr.hf1Sub],
          [Languages, tr.hf2Title, tr.hf2Sub],
          [BadgeCheck, tr.hf3Title, tr.hf3Sub],
          [Clock, tr.hf4Title, tr.hf4Sub],
        ].map(([Icon, title, sub], i) => (
          <div key={i} className="bg-card rounded-2xl border p-5">
            <Icon className="text-primary size-6" />
            <div className="mt-3 font-semibold">{title as string}</div>
            <div className="text-muted-foreground mt-1 text-sm">{sub as string}</div>
          </div>
        ))}
      </div>

      {/* built-for-bharat bar */}
      <div className="bg-card mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border p-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Heart className="size-5" />
          </span>
          <div>
            <div className="font-semibold">{tr.builtForBharat}</div>
            <div className="text-muted-foreground text-sm">{tr.builtForBharatSub}</div>
          </div>
        </div>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-1.5">
            <Github className="size-4" /> {tr.navStar}
          </Button>
        </a>
      </div>
    </Section>
  );
}

// ---------------- How It Works ----------------
function HowItWorks({ tr }: { tr: Tr }) {
  const steps = [
    [PhoneCall, tr.how1Title, tr.how1Sub],
    [MessagesSquare, tr.how2Title, tr.how2Sub],
    [BrainCircuit, tr.how3Title, tr.how3Sub],
    [Volume2, tr.how4Title, tr.how4Sub],
    [ListChecks, tr.how5Title, tr.how5Sub],
  ] as const;
  return (
    <Section id="how" className="bg-muted/30">
      <Heading title={tr.howTitle} sub={tr.howSub} />
      <div className="mx-auto max-w-3xl space-y-4">
        {steps.map(([Icon, title, sub], i) => (
          <div key={i} className="bg-card flex items-start gap-4 rounded-2xl border p-5">
            <span className="text-primary/40 w-10 shrink-0 text-2xl font-bold tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </span>
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-muted-foreground mt-1 text-sm">{sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-primary/20 bg-primary/5 text-primary mx-auto mt-10 max-w-3xl rounded-2xl border px-5 py-4 text-center text-sm font-semibold">
        {tr.howBanner}
      </div>
    </Section>
  );
}

// ---------------- Features ----------------
function Features({ tr }: { tr: Tr }) {
  const cards = [
    [Languages, tr.feat1Title, tr.feat1Sub],
    [MessagesSquare, tr.feat2Title, tr.feat2Sub],
    [Radio, tr.feat3Title, tr.feat3Sub],
    [BadgeCheck, tr.feat4Title, tr.feat4Sub],
    [Clock, tr.feat5Title, tr.feat5Sub],
    [ShieldCheck, tr.feat6Title, tr.feat6Sub],
    [Wifi, tr.feat7Title, tr.feat7Sub],
    [MousePointerClick, tr.feat8Title, tr.feat8Sub],
    [TrendingUp, tr.feat9Title, tr.feat9Sub],
  ] as const;
  return (
    <Section id="features">
      <Heading title={tr.featTitle} sub={tr.featSub} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([Icon, title, sub], i) => (
          <div key={i} className="bg-card rounded-2xl border p-6 transition-shadow hover:shadow-md">
            <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </span>
            <div className="mt-4 font-semibold">{title}</div>
            <div className="text-muted-foreground mt-1 text-sm leading-6">{sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-primary text-primary-foreground mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl px-6 py-5 sm:flex-row">
        <span className="font-semibold">{tr.featCtaText}</span>
        <a href="#widget">
          <Button variant="secondary" className="gap-1.5">
            <PhoneCall className="size-4" /> {tr.featCtaBtn}
          </Button>
        </a>
      </div>
    </Section>
  );
}

// ---------------- Tech Stack (our real stack) ----------------
function TechStack({ tr }: { tr: Tr }) {
  const groups = [
    [
      tr.techGroupVoice,
      [
        [Volume2, 'Murf Falcon TTS', 'Streaming text-to-speech voice'],
        [Mic, 'Deepgram Nova-3 STT', 'Hinglish speech-to-text'],
        [BrainCircuit, 'Google Gemini', 'LLM reasoning & responses'],
      ],
    ],
    [
      tr.techGroupOrchestration,
      [
        [ServerCog, 'LiveKit Agents', 'Real-time voice pipeline (Python)'],
        [Radio, 'Silero VAD + Turn Detector', 'Knows when you start & stop'],
      ],
    ],
    [
      tr.techGroupFrontend,
      [
        [Code2, 'Next.js', 'React frontend framework'],
        [Rocket, 'Netlify', 'Deployment & hosting'],
      ],
    ],
  ] as const;
  return (
    <Section id="tech" className="bg-muted/30">
      <Heading title={tr.techTitle} sub={tr.techSub} />
      <div className="mx-auto max-w-4xl space-y-5">
        {groups.map(([label, items]) => (
          <div key={label} className="bg-card rounded-2xl border p-6">
            <div className="text-muted-foreground mb-4 text-xs font-semibold tracking-wide uppercase">
              {label}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(([Icon, name, desc]) => (
                <div key={name} className="flex items-start gap-3">
                  <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-muted-foreground text-xs">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border p-5 sm:flex-row">
        <div>
          <div className="font-semibold">{tr.techBuiltWith}</div>
          <div className="text-muted-foreground text-sm">{tr.techBuiltWithSub}</div>
        </div>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-1.5">
            <Github className="size-4" /> {tr.navStar}
          </Button>
        </a>
      </div>
    </Section>
  );
}

// ---------------- Impact / About ----------------
function Impact({ tr }: { tr: Tr }) {
  const pillars = [
    [Target, tr.missionTitle, tr.missionSub],
    [Sparkles, tr.visionTitle, tr.visionSub],
    [ShieldCheck, tr.valuesTitle, tr.valuesSub],
  ] as const;
  return (
    <Section id="impact">
      <div id="about" className="scroll-mt-24" />
      <Heading title={tr.aboutTitle} sub={tr.aboutIntro} />
      <div className="grid gap-5 sm:grid-cols-3">
        {pillars.map(([Icon, title, sub]) => (
          <div key={title} className="bg-card rounded-2xl border p-6 text-center">
            <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
              <Icon className="size-6" />
            </span>
            <div className="mt-4 font-semibold">{title}</div>
            <div className="text-muted-foreground mt-1 text-sm leading-6">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-card mt-6 rounded-2xl border p-6">
        <div className="font-semibold">{tr.whyTitle}</div>
        <p className="text-muted-foreground mt-2 leading-7">{tr.whySub}</p>
      </div>

      <div className="border-primary/20 bg-primary/5 mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border p-6 sm:flex-row">
        <div>
          <div className="font-semibold">{tr.joinTitle}</div>
          <div className="text-muted-foreground text-sm">{tr.joinSub}</div>
        </div>
        <div className="flex gap-3">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Button className="gap-1.5">
              <Github className="size-4" /> {tr.joinStar}
            </Button>
          </a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-1.5">
              <Heart className="size-4" /> {tr.joinContribute}
            </Button>
          </a>
        </div>
      </div>
    </Section>
  );
}

// ---------------- Footer ----------------
function Footer({ tr, logo }: { tr: Tr; logo: string }) {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm sm:flex-row">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="DukaanSaathi" className="size-5" />
          <span className="text-foreground font-semibold">DukaanSaathi</span> · {tr.footerTagline}
        </span>
        <span>{tr.footerRights}</span>
      </div>
    </footer>
  );
}

export function Landing({ appConfig }: { appConfig: AppConfig }) {
  const { tr } = useLanguage();
  const logo = appConfig.logo;
  return (
    <div className="flex min-h-svh flex-col">
      <Nav tr={tr} logo={logo} />
      <main className="flex-1">
        <Hero tr={tr} />
        <HowItWorks tr={tr} />
        <Features tr={tr} />
        <TechStack tr={tr} />
        <Impact tr={tr} />
      </main>
      <Footer tr={tr} logo={logo} />
    </div>
  );
}
