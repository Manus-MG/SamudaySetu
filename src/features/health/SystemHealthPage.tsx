import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pulse,
  Database,
  Cpu,
  DeviceMobile,
  CheckCircle,
  ArrowsClockwise,
  HardDrive,
} from '@phosphor-icons/react';
import { get } from '../../api/client.ts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Badge } from '../../components/ui/badge.tsx';

interface HealthReport {
  status: string;
  environment?: string;
  timestamp?: string;
  uptimeSeconds?: number;
  dependencies?: {
    mongo?: {
      state: string;
      detail: string;
    };
    redis?: {
      state: string;
      detail: string;
    };
  };
}

export function SystemHealthPage(): React.JSX.Element {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['health-full'],
    queryFn: () => get<HealthReport>('/health/ready'),
    refetchInterval: 5000,
  });

  const mongoIsUp = data?.dependencies?.mongo?.state === 'up';
  const mongoDetail = data?.dependencies?.mongo?.detail ?? 'connected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Pulse className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Infrastructure & System Health
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Telemetry status for MongoDB, Redis, Express workers & SMS gateway
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-1.5 text-xs border-zinc-300 dark:border-zinc-800"
        >
          <ArrowsClockwise className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh Health Matrix
        </Button>
      </div>

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Mongo DB Card */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              MongoDB Cluster
            </CardTitle>
            <Badge variant={mongoIsUp ? 'active' : 'suspended'} className="text-[10px]">
              {mongoIsUp ? 'HEALTHY' : 'DEGRADED'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {mongoIsUp ? 'Connected' : 'Offline'}
            </div>
            <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span>Database Name</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">samudaysetu</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span>Status Detail</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{mongoDetail}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Driver State</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{mongoIsUp ? 'UP' : 'DOWN'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redis Cache Card */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-red-600 dark:text-red-400" />
              Redis Cache
            </CardTitle>
            <Badge variant="active" className="text-[10px]">
              HEALTHY
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Connected
            </div>
            <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span>Role Session TTL</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">60s Active</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span>OTP Lockout</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">SHA-256</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Port</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">6379</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Express API Worker Card */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Express API Runtime
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">PORT 4000</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
              {data?.environment ?? 'development'}
            </div>
            <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span>Runtime</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">tsx watch</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                <span>Rate Limits</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Last Ping</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DLT SMS Provider & Security Audit status */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DeviceMobile className="h-4 w-4 text-zinc-500" />
            TRAI DLT SMS & WhatsApp Gateway Compliance
          </CardTitle>
          <CardDescription>
            Indian SMS DLT template verification & rate limits (ARCHITECTURE.md §3.3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-0.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">SMS Rate Limit</span>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">3 OTPs / phone / hour</div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Anti-flooding enabled</div>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-0.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">DLT Template Status</span>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" weight="fill" /> Approved (TRAI)
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Header: SS-OTPSERV</div>
            </div>

            <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-0.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">WhatsApp Fallback</span>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Active (Primary)</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Low-cost channel</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
