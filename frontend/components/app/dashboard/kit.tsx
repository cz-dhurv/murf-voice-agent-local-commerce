'use client';

import * as React from 'react';
import { AlertTriangle, FlaskConical, Loader2 } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/shadcn/utils';
import { cx } from './data';

// Semantic color tones — the ONE place the green=ok / orange=brand / red=stop /
// blue=info / gray=neutral vocabulary is defined, so every card stays consistent.
export type Tone = 'brand' | 'success' | 'danger' | 'info' | 'neutral';

const TONE_CHIP: Record<Tone, string> = {
  brand: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  neutral: 'bg-muted text-muted-foreground',
};

const TONE_DOT: Record<Tone, string> = {
  brand: 'bg-primary',
  success: 'bg-emerald-500',
  danger: 'bg-destructive',
  info: 'bg-blue-500',
  neutral: 'bg-muted-foreground',
};

// ---------------- Card ----------------
export function Card({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('bg-card rounded-2xl border p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  icon: Icon,
  children,
  right,
}: {
  icon?: React.ElementType;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className="text-primary size-5 shrink-0" />}
      <span className="font-semibold">{children}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

// ---------------- PageHeader ----------------
export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-muted-foreground mt-1 text-sm">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------- Icon chip ----------------
export function IconChip({
  icon: Icon,
  tone = 'brand',
  className,
}: {
  icon: React.ElementType;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg',
        TONE_CHIP[tone],
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

// ---------------- StatusPill ----------------
export function StatusPill({
  tone = 'neutral',
  children,
  pulse,
}: {
  tone?: Tone;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CHIP[tone]
      )}
    >
      <span className={cn('size-1.5 rounded-full', TONE_DOT[tone], pulse && 'animate-pulse')} />
      {children}
    </span>
  );
}

// ---------------- KPI / StatCard ----------------
export function StatCard({
  icon,
  tone = 'brand',
  label,
  value,
  hint,
  badge,
}: {
  icon: React.ElementType;
  tone?: Tone;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <IconChip icon={icon} tone={tone} className="size-8" />
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="mt-2 truncate text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</div>}
    </Card>
  );
}

// ---------------- MetaRow (definition list row) ----------------
export function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

// ---------------- DemoBadge ----------------
// Honest labelling: any surface NOT backed by the real SQLite/LiveKit backend
// wears this, so demo data is never mistaken for a live operation.
export function DemoBadge({
  className,
  label = 'Demo data',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400',
            className
          )}
        >
          <FlaskConical className="size-3" /> {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Illustrative sample — not wired to a live backend yet. Real data comes from the
        caller-memory store and the LiveKit voice session.
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------- EmptyState ----------------
export function EmptyState({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      {Icon && (
        <span className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-2xl">
          <Icon className="size-6" />
        </span>
      )}
      <div className="text-foreground font-semibold">{title}</div>
      {sub && <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------- Spinner row ----------------
export function LoadingRow({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

// ---------------- Tabs (headless, controlled) ----------------
export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ElementType }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.id)}
            className={cx(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {t.icon && <t.icon className="size-4" />} {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- ConfirmDialog (destructive actions) ----------------
// Radix dialog directly — no repo-wide dialog wrapper exists, and a full shadcn
// dialog kit would be scaffolding for the two confirms we actually need.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  busy,
  danger = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-xl">
          <div className="flex items-start gap-3">
            {danger && (
              <span className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-xl">
                <AlertTriangle className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground mt-1.5 text-sm leading-6">
                {body}
              </DialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <Button variant="outline" size="sm" disabled={busy}>
                Cancel
              </Button>
            </DialogPrimitive.Close>
            <Button
              variant={danger ? 'destructive' : 'default'}
              size="sm"
              onClick={onConfirm}
              disabled={busy}
              className="gap-1.5"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
