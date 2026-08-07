import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pulse,
  Buildings,
  UsersThree,
  DeviceMobile,
  ShieldWarning,
  Eye,
  Plus,
} from '@phosphor-icons/react';
import { get } from '../../api/client.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Badge } from '../../components/ui/badge.tsx';

interface HealthResponse {
  status: string;
  environment?: string;
  timestamp?: string;
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

export function SuperAdminDashboardPage(): React.JSX.Element {
  const { startImpersonation } = useAuth();

  const { data: healthData, isError: isHealthError } = useQuery({
    queryKey: ['health-ready'],
    queryFn: () => get<HealthResponse>('/health/ready'),
    refetchInterval: 10_000,
  });

  const mongoState = healthData?.dependencies?.mongo?.state === 'up' ? 'UP' : 'DOWN';
  const mongoDetail = healthData?.dependencies?.mongo?.detail ?? 'connected';

  return (
    <div className="space-y-6">
      {/* ── Header Banner ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Overview Dashboard
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Platform operations center for multi-tenant sangathan hierarchies, SMS quotas & infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = '/tenants')}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            Provision Tenant
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => (window.location.href = '/users')}
            className="gap-1.5 text-xs"
          >
            <UsersThree className="h-4 w-4" />
            Manage Staff
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Tenants */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Provisioned Tenants</span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">142</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                +12 this month
              </span>
            </div>
            <div className="h-9 w-9 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <Buildings className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Members Count */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Members</span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">1,280,450</div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                +45.2k this week
              </span>
            </div>
            <div className="h-9 w-9 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <UsersThree className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: System Health */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">API Status</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {isHealthError ? 'Degraded' : healthData?.status?.toUpperCase() ?? 'OK'}
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Mongo: {mongoState} ({mongoDetail})
              </span>
            </div>
            <div className="h-9 w-9 rounded-md bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Pulse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: SMS / OTP Quota */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">SMS OTP DLT Quota</span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">485,200 <span className="text-xs text-zinc-400 font-normal">/ 500k</span></div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                97.0% Quota Remaining
              </span>
            </div>
            <div className="h-9 w-9 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <DeviceMobile className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Provisioned Tenants & Hierarchy Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Buildings className="h-4 w-4 text-zinc-500" />
                  Active Communities & Sangathan Tenants
                </CardTitle>
                <CardDescription>
                  Multi-tenant isolates with level designations and span caps
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => (window.location.href = '/tenants')} className="text-xs h-7">
                View All
              </Button>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {[
                  {
                    id: 'tnt_gupta_samaj',
                    name: 'All India Gupta Samaj Trust',
                    type: 'SAMAJ',
                    levels: 'L0 (Rashtriya Adhyaksh) → L7 (Panna Pramukh)',
                    members: '450,210',
                    spanCap: '50 direct reports',
                  },
                  {
                    id: 'tnt_bjp_up_east',
                    name: 'BJP Pradesh Sangathan (UP East)',
                    type: 'POLITICAL',
                    levels: 'L0 (Rashtriya) → L6 (Booth Pramukh)',
                    members: '720,100',
                    spanCap: '30 direct reports',
                  },
                  {
                    id: 'tnt_gokuldham_rwa',
                    name: 'Gokuldham Federation RWA',
                    type: 'RWA',
                    levels: 'L0 (President) → L4 (Resident)',
                    members: '4,500',
                    spanCap: '10 direct reports',
                  },
                  {
                    id: 'tnt_iitk_alumni',
                    name: 'IIT Kanpur Alumni Network',
                    type: 'ALUMNI',
                    levels: 'L0 (President) → L3 (Alumnus)',
                    members: '105,640',
                    spanCap: '100 direct reports',
                  },
                ].map((tenant) => (
                  <div key={tenant.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{tenant.name}</span>
                        <Badge
                          variant={
                            tenant.type === 'SAMAJ'
                              ? 'superAdmin'
                              : tenant.type === 'POLITICAL'
                              ? 'active'
                              : 'default'
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tenant.type}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {tenant.levels} · Cap: {tenant.spanCap}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{tenant.members}</div>
                        <div className="text-[10px] text-zinc-400">Members</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startImpersonation(tenant.id, tenant.name)}
                        className="text-xs h-7 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Live System Alerts & Audit Stream */}
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldWarning className="h-4 w-4 text-amber-500" />
                Audit Stream & Security Log
              </CardTitle>
              <CardDescription>Break-glass TOTP & PII audit alerts</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {[
                {
                  id: 1,
                  event: 'SUPER_ADMIN TOTP Verified',
                  actor: 'Vikramaditya S.',
                  time: '2m ago',
                  type: 'SUCCESS',
                },
                {
                  id: 2,
                  event: 'Member Export Alert (>5k Rows)',
                  actor: 'Leader @ UP East',
                  time: '14m ago',
                  type: 'WARN',
                },
                {
                  id: 3,
                  event: 'Tenant Provisioned (IITK)',
                  actor: 'Platform Ops',
                  time: '1h ago',
                  type: 'INFO',
                },
                {
                  id: 4,
                  event: 'Support Session Ended',
                  actor: 'Support Agent 04',
                  time: '3h ago',
                  type: 'INFO',
                },
              ].map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-md border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-start justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{log.event}</div>
                    <div className="text-[11px] text-zinc-500">Actor: {log.actor}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-400 font-mono">{log.time}</span>
                    <Badge variant={log.type === 'WARN' ? 'pending' : 'active'} className="text-[10px] py-0 px-1">
                      {log.type}
                    </Badge>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-zinc-700 dark:text-zinc-300 mt-1 h-8"
                onClick={() => (window.location.href = '/audit')}
              >
                View Audit Ledger
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
