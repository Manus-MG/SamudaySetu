import React from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Pulse, UsersThree, ShieldCheck, Clock, ArrowRight } from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from '../../api/types.ts';
import { healthApi, healthKeys } from '../health/health.api.ts';
import { userKeys, usersApi } from '../users/users.api.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { buttonVariants } from '../../components/ui/button.tsx';

/**
 * Counting by role costs one request per role. That is acceptable because
 * `pageSize: 1` makes each one an indexed count with a single document returned —
 * and it keeps the dashboard honest until the backend grows a stats endpoint.
 */
const COUNT_PAGE_SIZE = 1;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();

  const statusQuery = useQuery({
    queryKey: healthKeys.status,
    queryFn: healthApi.status,
    refetchInterval: 30_000,
  });

  // One query per role rather than one union-typed `useQueries` call, so each
  // result keeps its own type instead of collapsing to a union.
  const roleQueries = useQueries({
    queries: ROLES.map((role) => ({
      queryKey: userKeys.list({ role, page: 1, pageSize: COUNT_PAGE_SIZE }),
      queryFn: () => usersApi.list({ role, page: 1, pageSize: COUNT_PAGE_SIZE }),
    })),
  });

  const countsByRole = ROLES.reduce<Record<Role, number | null>>(
    (accumulator, role, index) => {
      accumulator[role] = roleQueries[index]?.data?.total ?? null;
      return accumulator;
    },
    { SUPER_ADMIN: null, ADMIN: null, LEADER: null, USER: null },
  );

  const knownCounts = Object.values(countsByRole).filter(
    (value): value is number => value !== null,
  );
  const totalAccounts = knownCounts.length === ROLES.length
    ? knownCounts.reduce((sum, value) => sum + value, 0)
    : null;

  const status = statusQuery.data;
  const countsError = roleQueries.find((query) => query.isError)?.error;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Overview
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Signed in as {user?.fullName ?? user?.email} · {user ? ROLE_LABELS[user.role] : ''}
        </p>
      </div>

      {countsError && (
        <div
          role="alert"
          className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs"
        >
          {errorMessage(countsError)}
        </div>
      )}

      {/* ── Metrics ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total accounts"
          value={totalAccounts?.toLocaleString() ?? '—'}
          hint="Across every role"
          icon={UsersThree}
        />
        <MetricCard
          label="Staff accounts"
          value={
            countsByRole.SUPER_ADMIN !== null && countsByRole.ADMIN !== null
              ? (countsByRole.SUPER_ADMIN + countsByRole.ADMIN).toLocaleString()
              : '—'
          }
          hint="Super Admin + Admin"
          icon={ShieldCheck}
        />
        <MetricCard
          label="API status"
          value={status ? status.status.toUpperCase() : statusQuery.isError ? 'OFFLINE' : '—'}
          hint={status ? `MongoDB: ${status.dependencies.mongo.detail}` : 'Waiting for the API'}
          icon={Pulse}
          tone={
            status?.status === 'ok' ? 'positive' : statusQuery.isError ? 'negative' : 'neutral'
          }
        />
        <MetricCard
          label="API uptime"
          value={status ? formatUptime(status.uptimeSeconds) : '—'}
          hint={status ? `${status.service} v${status.version}` : 'Waiting for the API'}
          icon={Clock}
        />
      </div>

      {/* ── Roles + quick links ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UsersThree className="h-4 w-4 text-zinc-500" />
              Accounts by role
            </CardTitle>
            <CardDescription>
              Roles are fixed in code. Titles like “Zila Adhyaksh” are designations, a separate
              concept, and never become roles.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {ROLES.map((role) => (
                <div key={role} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          role === 'SUPER_ADMIN'
                            ? 'superAdmin'
                            : role === 'ADMIN'
                              ? 'admin'
                              : role === 'LEADER'
                                ? 'leader'
                                : 'user'
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {ROLE_LABELS[role]}
                      </Badge>
                      <code className="text-[10px] text-zinc-400 font-mono">{role}</code>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {countsByRole[role]?.toLocaleString() ?? '—'}
                    </div>
                    <div className="text-[10px] text-zinc-400">accounts</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/users"
              className={`${buttonVariants({ variant: 'outline', size: 'sm' })} w-full mt-4 gap-1.5`}
            >
              Manage users
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pulse className="h-4 w-4 text-zinc-500" />
              Service
            </CardTitle>
            <CardDescription>Live from /api/v1/status</CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 text-xs">
            <DetailRow label="Service" value={status?.service ?? '—'} />
            <DetailRow label="Version" value={status ? `v${status.version}` : '—'} />
            <DetailRow label="Environment" value={status?.environment ?? '—'} />
            <DetailRow label="MongoDB" value={status?.dependencies.mongo.state ?? '—'} />
            <DetailRow
              label="Checked"
              value={status ? new Date(status.timestamp).toLocaleTimeString() : '—'}
            />

            <Link
              to="/health"
              className={`${buttonVariants({ variant: 'outline', size: 'sm' })} w-full mt-2 gap-1.5`}
            >
              System health
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Presentational helpers ───────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  tone?: 'positive' | 'negative' | 'neutral';
}

const TONE_CLASS: Readonly<Record<NonNullable<MetricCardProps['tone']>, string>> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-zinc-900 dark:text-zinc-100',
};

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: MetricCardProps): React.JSX.Element {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
          <div className={`text-xl font-bold ${TONE_CLASS[tone]}`}>{value}</div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate" title={hint}>
            {hint}
          </span>
        </div>
        <div className="h-9 w-9 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate">{value}</span>
    </div>
  );
}
