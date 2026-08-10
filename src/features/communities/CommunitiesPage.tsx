import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowsClockwise,
  Buildings,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Plus,
  QrCode,
  WarningCircle,
} from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  ALLOWED_MODERATION,
  COMMUNITY_STATUSES,
  COMMUNITY_STATUS_LABELS,
  COMMUNITY_TYPES,
  COMMUNITY_TYPE_LABELS,
  type CommunityDto,
  type CommunityStatus,
  type CommunityType,
  type ListCommunitiesParams,
  type ModerationAction,
} from '../../api/types.ts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts';
import { communitiesApi, communityKeys } from './communities.api.ts';
import { CreateCommunityDialog } from './CreateCommunityDialog.tsx';
import { JoinKitDialog } from './JoinKitDialog.tsx';
import { RejectCommunityDialog } from './RejectCommunityDialog.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Select } from '../../components/ui/select.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';

const PAGE_SIZE = 20;

type StatusFilter = CommunityStatus | 'ALL';
type TypeFilter = CommunityType | 'ALL';

export const COMMUNITY_STATUS_BADGE: Readonly<
  Record<CommunityStatus, 'active' | 'pending' | 'suspended' | 'destructive' | 'outline'>
> = {
  ACTIVE: 'active',
  PENDING_APPROVAL: 'pending',
  SUSPENDED: 'suspended',
  REJECTED: 'destructive',
  ARCHIVED: 'outline',
};

const MODERATION_LABELS: Readonly<Record<ModerationAction, string>> = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
  SUSPEND: 'Suspend',
  REACTIVATE: 'Reactivate',
};

export function CommunitiesPage(): React.JSX.Element {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joinKitFor, setJoinKitFor] = useState<CommunityDto | null>(null);
  const [rejecting, setRejecting] = useState<CommunityDto | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 350);

  // Filtering and paging are the server's job; slicing locally would silently
  // hide every row past the first page.
  const params = useMemo<ListCommunitiesParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(search.length > 0 ? { search } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
    }),
    [page, search, statusFilter, typeFilter],
  );

  const communitiesQuery = useQuery({
    queryKey: communityKeys.list(params),
    queryFn: () => communitiesApi.list(params),
    placeholderData: (previous) => previous,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: communityKeys.all });
  };

  const moderateMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ModerationAction }) =>
      communitiesApi.moderate(id, action),
    onSuccess: invalidate,
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  const communities = communitiesQuery.data?.items ?? [];
  const totalPages = communitiesQuery.data?.totalPages ?? 1;
  const total = communitiesQuery.data?.total ?? 0;
  const pendingCount = communities.filter((c) => c.status === 'PENDING_APPROVAL').length;

  const resetToFirstPage = (): void => setPage(1);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Buildings className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Communities
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {total} communit{total === 1 ? 'y' : 'ies'}
            {pendingCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {' '}
                · {pendingCount} awaiting approval on this page
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void communitiesQuery.refetch()}
            disabled={communitiesQuery.isFetching}
            className="gap-1.5 text-xs h-8"
          >
            <ArrowsClockwise
              className={`h-3.5 w-3.5 ${communitiesQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs h-8">
            <Plus className="h-4 w-4" />
            Create Community
          </Button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-start gap-2"
        >
          <WarningCircle className="h-4 w-4 shrink-0 mt-px" />
          <span className="flex-1">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by name or join code…"
              aria-label="Search communities"
              className="pl-9 h-9 text-xs"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                resetToFirstPage();
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              aria-label="Filter by status"
              className="w-44"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                resetToFirstPage();
              }}
            >
              <option value="ALL">All statuses</option>
              {COMMUNITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {COMMUNITY_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by type"
              className="w-52"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as TypeFilter);
                resetToFirstPage();
              }}
            >
              <option value="ALL">All types</option>
              {COMMUNITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {COMMUNITY_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-medium uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th scope="col" className="px-5 py-3">Community</th>
                <th scope="col" className="px-5 py-3">Join code</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3">Members</th>
                <th scope="col" className="px-5 py-3">Leader</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {communitiesQuery.isPending && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner />
                      <span>Loading communities…</span>
                    </div>
                  </td>
                </tr>
              )}

              {communitiesQuery.isError && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-red-600 dark:text-red-400">
                    {errorMessage(communitiesQuery.error)}
                  </td>
                </tr>
              )}

              {communitiesQuery.isSuccess && communities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    No communities match these filters.
                  </td>
                </tr>
              )}

              {communities.map((row) => {
                const allowed = ALLOWED_MODERATION[row.status];
                const isBusy =
                  moderateMutation.isPending && moderateMutation.variables?.id === row.id;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/communities/${row.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline underline-offset-2"
                      >
                        {row.name}
                      </Link>
                      <div className="text-[11px] text-zinc-400">
                        {COMMUNITY_TYPE_LABELS[row.type]}
                        {row.location.district && ` · ${row.location.district}`}
                      </div>
                    </td>

                    <td className="px-5 py-3 font-mono text-[11px] tracking-wider">
                      {row.status === 'ARCHIVED' ? (
                        <span className="text-zinc-400">released</span>
                      ) : (
                        row.joinCodeFormatted
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <Badge
                        variant={COMMUNITY_STATUS_BADGE[row.status]}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {COMMUNITY_STATUS_LABELS[row.status]}
                      </Badge>
                      {row.status === 'ACTIVE' && !row.isJoinable && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          Joining closed
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3 tabular-nums">{row.memberCount}</td>

                    <td className="px-5 py-3 text-[11px]">
                      {row.leaderId ? (
                        <span className="text-zinc-600 dark:text-zinc-400">Assigned</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Unassigned</span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {row.status !== 'ARCHIVED' && row.status !== 'REJECTED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => setJoinKitFor(row)}
                          >
                            <QrCode className="h-3.5 w-3.5 mr-1" />
                            Share
                          </Button>
                        )}

                        {allowed.map((action) => (
                          <Button
                            key={action}
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            className={`text-xs h-7 px-2 ${
                              action === 'APPROVE' || action === 'REACTIVATE'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : action === 'REJECT'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                            }`}
                            onClick={() => {
                              setActionError(null);
                              // Rejection needs a reason, so it goes through a
                              // dialog instead of firing straight away.
                              if (action === 'REJECT') setRejecting(row);
                              else moderateMutation.mutate({ id: row.id, action });
                            }}
                          >
                            {MODERATION_LABELS[action]}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500">
            <span>
              Page {communitiesQuery.data?.page ?? page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1 || communitiesQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <CaretLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= totalPages || communitiesQuery.isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <CaretRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateCommunityDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={invalidate}
      />

      <JoinKitDialog
        communityId={joinKitFor?.id ?? null}
        communityName={joinKitFor?.name ?? ''}
        onOpenChange={(open) => {
          if (!open) setJoinKitFor(null);
        }}
      />

      <RejectCommunityDialog
        community={rejecting}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        onRejected={invalidate}
      />
    </div>
  );
}
