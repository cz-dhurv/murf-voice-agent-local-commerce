'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Database,
  Github,
  Home,
  Languages,
  LifeBuoy,
  Menu,
  PhoneOff,
  Plug,
  Radio,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import { useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import { LanguageToggle } from '@/components/app/language-toggle';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';
import { useCallers, useCatalogue } from './data';

const REPO_URL = 'https://github.com/cz-dhurv/murf-voice-agent-local-commerce';

type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/live', label: 'Live Session', icon: Radio },
  { href: '/dashboard/analytics', label: 'Call Analytics', icon: BarChart3 },
  { href: '/dashboard/catalogue', label: 'Catalogue', icon: Boxes },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/callers', label: 'Caller Profiles', icon: Users },
  { href: '/dashboard/escalations', label: 'Human Help Queue', icon: LifeBuoy },
  { href: '/dashboard/agents', label: 'Agent', icon: Bot },
  { href: '/dashboard/memory', label: 'Memory & Data', icon: Database },
  { href: '/dashboard/integrations', label: 'Tools & Integrations', icon: Plug },
  { href: '/dashboard/multilingual', label: 'Multilingual', icon: Languages },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

// mm:ss elapsed since a monotonic start — the header's live-call timer.
function useElapsed(active: boolean): string {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) {
      setSecs(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dukaan-logo.svg" alt="Voice for Bharat" className="size-7" />
      <span className="text-sm font-bold tracking-tight">
        Voice for <span className="text-primary">Bharat</span>
      </span>
    </Link>
  );
}

function FleetStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// Real footer counters — the two SQLite tables the agent actually reads/writes.
function StoreStatus() {
  const { callers, db, loading, error } = useCallers();
  const { catalogue, loading: catLoading } = useCatalogue();
  const connected = !error && !!db?.connected;

  return (
    <div className="bg-muted/40 space-y-2 rounded-xl p-3">
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold',
          connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            connected ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
        {connected ? 'Memory store connected' : 'Store offline'}
      </div>
      <FleetStat label="Known callers" value={loading ? '—' : callers.length} />
      <FleetStat label="Catalogue items" value={catLoading ? '—' : catalogue.length} />
      <FleetStat label="Engine" value={db?.engine ?? 'SQLite'} />
    </div>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4 shrink-0" /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t p-4">
        <StoreStatus />
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Github className="size-4" /> Star on GitHub
          </Button>
        </a>
      </div>
    </div>
  );
}

// ---------------- header live-call banner (real session) ----------------
function LiveCallBanner() {
  const { isConnected, end } = useSessionContext();
  const { state } = useVoiceAssistant();
  const elapsed = useElapsed(isConnected);

  if (!isConnected) {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex">
        <span className="bg-muted-foreground/40 size-1.5 rounded-full" /> No active call
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
        <span className="tabular-nums">{elapsed}</span>
        <span className="text-muted-foreground hidden font-normal capitalize md:inline">
          · {state}
        </span>
      </span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => end()}
        className="hidden gap-1.5 sm:inline-flex"
      >
        <PhoneOff className="size-4" /> End Call
      </Button>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="bg-muted/20 flex min-h-svh">
      {/* desktop sidebar */}
      <aside className="bg-background sticky top-0 hidden h-svh w-64 shrink-0 border-r lg:block">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-in fade-in-0 absolute inset-0 bg-black/50"
            onClick={closeDrawer}
            aria-hidden
          />
          <aside className="bg-background animate-in slide-in-from-left absolute top-0 left-0 h-full w-72 border-r shadow-xl">
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              className="text-muted-foreground hover:text-foreground absolute top-4 right-3 z-10"
            >
              <X className="size-5" />
            </button>
            <SidebarBody pathname={pathname} onNavigate={closeDrawer} />
          </aside>
        </div>
      )}

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="hover:bg-muted rounded-md p-2 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <LiveCallBanner />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <button
              type="button"
              aria-label="Notifications"
              className="hover:bg-muted relative rounded-md p-2"
            >
              <Bell className="size-4.5" />
              <span className="bg-primary absolute top-1.5 right-1.5 size-2 rounded-full" />
            </button>
            <ThemeToggle className="hidden sm:flex" />
            <Link
              href="/dashboard/settings"
              className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-bold"
              title="Admin · Super Admin"
            >
              SA
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t px-6 py-4">
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-center text-xs">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            All conversations are secure, encrypted, and stored with consent.
          </p>
        </footer>
      </div>
    </div>
  );
}
