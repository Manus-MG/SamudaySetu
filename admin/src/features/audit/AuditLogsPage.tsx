import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
  ShieldCheckered,
} from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  AUDIT_ACTIONS,
  AUDIT_RESOURCE_TYPES,
  ROLE_LABELS,
  type AuditAction,
  type AuditLogDto,
  type AuditResourceType,
  type ListAuditParams,
} from '../../api/types.ts';
import { auditApi, auditKeys } from './audit.api.ts';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Select } from '../../components/ui/select.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';

const PAGE_SIZE = 25;

type ActionFilter = AuditAction | 'ALL';
type ResourceFilter = AuditResourceType | 'ALL';

/** `COMMUNITY_JOIN_CODE_ROTATED` → `Join code rotated`. */
function humaniseAction(action: AuditAction): string {
  const withoutPrefix = action.replace(/^(COMMUNITY|USER)_/, '');
  const words = withoutPrefix.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Destructive and privilege-changing events are worth spotting at a glance. */
function actionTone(action: AuditAction): 'destructive' | 'pending' | 'default' {
  if (
    action.endsWith('_DELETED') ||
    action.endsWith('_ARCHIVED') ||
    action.endsWith('_REJECTED') ||
    action.endsWith('_SUSPENDED')
  ) {
    return 'destructive';
  }
  if (action.endsWith('_ROTATED') || action.endsWith('_ROLE_ASSIGNED')) return 'pending';
  return 'default';
}

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

/**
 * The audit trail.
 *
 * Read-only by construction: the API exposes no write route and the collection
 * rejects updates, so there is deliberately nothing on this page to click except
 * filters.
 */
export function AuditLogsPage(): React.JSX.Element {
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = useMemo<ListAuditParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(actionFilter !== 'ALL' ? { action: actionFilter } : {}),
      ...(resourceFilter !== 'ALL' ? { resourceType: resourceFilter } : {}),
      ...(from ? { from: new Date(from).toISOString() } : {}),
      // A date input means the whole day; the API's `to` is exclusive, so push it
      // to the next midnight or the selected day is silently excluded.
      ...(to ? { to: new Date(new Date(to).getTime() + 86_400_000).toISOString() } : {}),
    }),
    [page, actionFilter, resourceFilter, from, to],
  );

  const auditQuery = useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.list(params),
    placeholderData: (previous) => previous,
  });

  const entries = auditQuery.data?.items ?? [];
  const totalPages = auditQuery.data?.totalPages ?? 1;
  const total = auditQuery.data?.total ?? 0;

  const resetToFirstPage = (): void => setPage(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheckered className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Audit Log
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {total} recorded event{total === 1 ? '' : 's'} · append-only, never edited or deleted
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void auditQuery.refetch()}
          disabled={auditQuery.isFetching}
          className="gap-1.5 text-xs h-8"
        >
          <ArrowsClockwise className={`h-3.5 w-3.5 ${auditQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label htmlFor="audit-action" className="text-[10px] uppercase tracking-wide text-zinc-400">
              Action
            </label>
            <Select
              id="audit-action"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as ActionFilter);
                resetToFirstPage();
              }}
            >
              <option value="ALL">All actions</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {humaniseAction(action)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1 w-40">
            <label
              htmlFor="audit-resource"
              className="text-[10px] uppercase tracking-wide text-zinc-400"
            >
              Resource
            </label>
            <Select
              id="audit-resource"
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value as ResourceFilter);
                resetToFirstPage();
              }}
            >
              <option value="ALL">All</option>
              {AUDIT_RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'COMMUNITY' ? 'Communities' : 'Accounts'}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1 w-40">
            <label htmlFor="audit-from" className="text-[10px] uppercase tracking-wide text-zinc-400">
              From
            </label>
            <Input
              id="audit-from"
              type="date"
              className="h-9 text-xs"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                resetToFirstPage();
              }}
            />
          </div>

          <div className="space-y-1 w-40">
            <label htmlFor="audit-to" className="text-[10px] uppercase tracking-wide text-zinc-400">
              To
            </label>
            <Input
              id="audit-to"
              type="date"
              className="h-9 text-xs"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                resetToFirstPage();
              }}
            />
          </div>

          {(actionFilter !== 'ALL' || resourceFilter !== 'ALL' || from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9"
              onClick={() => {
                setActionFilter('ALL');
                setResourceFilter('ALL');
                setFrom('');
                setTo('');
                resetToFirstPage();
              }}
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-medium uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th scope="col" className="px-5 py-3">When</th>
                <th scope="col" className="px-5 py-3">Action</th>
                <th scope="col" className="px-5 py-3">What happened</th>
                <th scope="col" className="px-5 py-3">Actor</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {auditQuery.isPending && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner />
                      <span>Loading audit trail…</span>
                    </div>
                  </td>
                </tr>
              )}

              {auditQuery.isError && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-red-600 dark:text-red-400">
                    {errorMessage(auditQuery.error)}
                  </td>
                </tr>
              )}

              {auditQuery.isSuccess && entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                    No events match these filters.
                  </td>
                </tr>
              )}

              {entries.map((entry: AuditLogDto) => (
                <React.Fragment key={entry.id}>
                  <tr
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-[11px] text-zinc-500">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={actionTone(entry.action)} className="text-[10px] px-1.5 py-0">
                        {humaniseAction(entry.action)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100">{entry.summary}</td>
                    <td className="px-5 py-3 text-[11px] whitespace-nowrap">
                      {ROLE_LABELS[entry.actorRole]}
                      <span className="block font-mono text-[10px] text-zinc-400">
                        {entry.actorId.slice(-8)}
                      </span>
                    </td>
                  </tr>

                  {expandedId === entry.id && (
                    <tr className="bg-zinc-50/70 dark:bg-zinc-800/30">
                      <td colSpan={4} className="px-5 py-3">
                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                          <Meta label="Resource">{`${entry.resourceType} ${entry.resourceId}`}</Meta>
                          <Meta label="Community">{entry.communityId ?? '—'}</Meta>
                          <Meta label="IP">{entry.ip ?? '—'}</Meta>
                          <Meta label="Request">{entry.requestId ?? '—'}</Meta>
                        </dl>

                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <pre className="mt-3 p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono overflow-x-auto">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500">
            <span>
              Page {auditQuery.data?.page ?? page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1 || auditQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <CaretLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= totalPages || auditQuery.isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <CaretRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="font-mono text-zinc-700 dark:text-zinc-300 break-all">{children}</dd>
    </div>
  );
}
