'use client';

import Link from 'next/link';
import { HardDrive, Info, Server, Wrench } from 'lucide-react';
import { fmtBytes, useCallers } from '@/components/app/dashboard/data';
import { Card, LoadingRow, PageHeader, StatusPill } from '@/components/app/dashboard/kit';
import { useLanguage } from '@/components/app/language-provider';
import { Button } from '@/components/ui/button';

// Memory & Data — REAL SQLite store status from /api/callers `db` block.
export default function MemoryPage() {
  const { tr } = useLanguage();
  const { db, loading, error } = useCallers();

  const rows: [string, string][] = [
    [tr.mdEngine, db?.engine ?? 'SQLite'],
    [tr.mdStatus, db?.connected ? tr.mdConnected : tr.mdOffline],
    [tr.mdRecords, String(db?.records ?? 0)],
    [tr.mdSize, fmtBytes(db?.sizeBytes ?? 0)],
    [tr.mdDriver, db?.driver ?? 'node:sqlite'],
  ];

  return (
    <div>
      <PageHeader
        title={tr.mdTitle}
        sub={tr.mdSub}
        actions={
          <Link href="/dashboard/memory/tools">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Wrench className="size-4" /> {tr.mtTitle}
            </Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingRow label={tr.memLoading} />
      ) : (
        <>
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Server className="text-primary size-5" />
              <span className="font-semibold">{tr.mdStoreTitle}</span>
              <span className="ml-auto">
                <StatusPill tone={db?.connected ? 'success' : 'neutral'} pulse={db?.connected}>
                  {db?.connected ? tr.mdConnected : tr.mdOffline}
                </StatusPill>
              </span>
            </div>
            {error && (
              <p className="text-destructive mb-3 text-sm">
                The caller store did not respond — values below are placeholders, not live.
              </p>
            )}
            <dl className="divide-y">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <HardDrive className="text-primary size-5" />
              <div className="mt-3 font-semibold">{tr.mdPersistTitle}</div>
              <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mdPersistBody}</p>
            </Card>
            <Card className="p-6">
              <Info className="text-primary size-5" />
              <div className="mt-3 font-semibold">{tr.mdBackupTitle}</div>
              <p className="text-muted-foreground mt-1 text-sm leading-6">{tr.mdBackupBody}</p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
