import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pulse, Database, Cpu, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { healthApi, healthKeys } from './health.api.ts';

const POLL_INTERVAL_MS = 10_000;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts = [days > 0 ? `${days}d` : null, hours > 0 ? `${hours}h` : null, `${minutes}m`];
  return parts.filter(Boolean).join(' ');
}

/**
 * Every value here comes from `/api/v1/status`. Nothing on this page is
 * hard-coded: a health screen that shows a green light it did not measure is
 * worse than no health screen.
 */
export function SystemHealthPage(): React.JSX.Element {
  const { data, error, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: healthKeys.status,
    queryFn: healthApi.status,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const mongoUp = data?.dependencies.mongo.state === 'up';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Pulse className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            System Health
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live readiness for the API process and its dependencies · polled every{' '}
            {POLL_INTERVAL_MS / 1000}s
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs border-zinc-300 dark:border-zinc-800"
        >
          <ArrowsClockwise className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isError && (
        <div
          role="alert"
          className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-start gap-2"
        >
          <WarningCircle className="h-4 w-4 shrink-0 mt-px" />
          <span>{errorMessage(error)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── MongoDB ──────────────────────────────────────────────────────── */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-zinc-500" />
              MongoDB
            </CardTitle>
            <Badge variant={mongoUp ? 'active' : 'suspended'} className="text-[10px]">
              {mongoUp ? 'UP' : 'DOWN'}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-3 pt-1">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data ? (mongoUp ? 'Connected' : 'Disconnected') : '—'}
            </div>
            <dl className="space-y-1 text-xs">
              <Row label="Driver state" value={data?.dependencies.mongo.state ?? '—'} />
              <Row label="Detail" value={data?.dependencies.mongo.detail ?? '—'} />
              <Row label="Overall readiness" value={data?.status ?? '—'} />
            </dl>
          </CardContent>
        </Card>

        {/* ── API process ──────────────────────────────────────────────────── */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-zinc-500" />
              API process
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {data?.environment ?? '—'}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-3 pt-1">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data ? formatUptime(data.uptimeSeconds) : '—'}
            </div>
            <dl className="space-y-1 text-xs">
              <Row label="Service" value={data?.service ?? '—'} />
              <Row label="Version" value={data ? `v${data.version}` : '—'} />
              <Row
                label="Server time"
                value={data ? new Date(data.timestamp).toLocaleTimeString() : '—'}
              />
              <Row
                label="Last polled"
                value={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
        Readiness is read from the driver&rsquo;s cached connection state rather than by issuing a
        query, so polling this page costs the database nothing.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-mono text-zinc-800 dark:text-zinc-200 truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}
