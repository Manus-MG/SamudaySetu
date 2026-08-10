import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowsClockwise,
  Buildings,
  QrCode,
  Trash,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  ALLOWED_MODERATION,
  COMMUNITY_STATUS_LABELS,
  COMMUNITY_TYPE_LABELS,
  type CommunityDto,
  type ModerationAction,
  type UserDto,
} from '../../api/types.ts';
import { userKeys, usersApi } from '../users/users.api.ts';
import { communitiesApi, communityKeys } from './communities.api.ts';
import { COMMUNITY_STATUS_BADGE } from './CommunitiesPage.tsx';
import { JoinKitDialog } from './JoinKitDialog.tsx';
import { RejectCommunityDialog } from './RejectCommunityDialog.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.tsx';
import { Select } from '../../components/ui/select.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx';

const MEMBERS_PAGE_SIZE = 10;
const LEADER_PAGE_SIZE = 100;

const MODERATION_LABELS: Readonly<Record<ModerationAction, string>> = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
  SUSPEND: 'Suspend',
  REACTIVATE: 'Reactivate',
};

const formatDateTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function CommunityDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);
  const [isJoinKitOpen, setIsJoinKitOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [memberPage, setMemberPage] = useState(1);

  const communityQuery = useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => communitiesApi.getById(id),
    enabled: id.length > 0,
  });

  const memberParams = useMemo(() => ({ page: memberPage, pageSize: MEMBERS_PAGE_SIZE }), [memberPage]);

  const membersQuery = useQuery({
    queryKey: communityKeys.members(id, memberParams),
    queryFn: () => communitiesApi.members(id, memberParams),
    enabled: id.length > 0,
    placeholderData: (previous) => previous,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: communityKeys.all });
  };

  const moderateMutation = useMutation({
    mutationFn: (action: ModerationAction) => communitiesApi.moderate(id, action),
    onSuccess: invalidate,
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  const joinableMutation = useMutation({
    mutationFn: (isJoinable: boolean) => communitiesApi.update(id, { isJoinable }),
    onSuccess: invalidate,
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  const reconcileMutation = useMutation({
    mutationFn: () => communitiesApi.reconcileMemberCount(id),
    onSuccess: invalidate,
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => communitiesApi.archive(id),
    onSuccess: () => {
      invalidate();
      navigate('/communities', { replace: true });
    },
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  if (communityQuery.isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-xs text-zinc-500">
        <Spinner />
        <span>Loading community…</span>
      </div>
    );
  }

  if (communityQuery.isError || !communityQuery.data) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-8 text-center space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage(communityQuery.error)}
          </p>
          <Link to="/communities" className="text-xs underline underline-offset-2">
            Back to communities
          </Link>
        </CardContent>
      </Card>
    );
  }

  const community = communityQuery.data;
  const allowed = ALLOWED_MODERATION[community.status];
  const isClosed = community.status === 'ARCHIVED' || community.status === 'REJECTED';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          to="/communities"
          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All communities
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Buildings className="h-5 w-5 text-zinc-700 dark:text-zinc-300 shrink-0" />
              <span className="truncate">{community.name}</span>
              <Badge
                variant={COMMUNITY_STATUS_BADGE[community.status]}
                className="text-[10px] px-1.5 py-0 shrink-0"
              >
                {COMMUNITY_STATUS_LABELS[community.status]}
              </Badge>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {COMMUNITY_TYPE_LABELS[community.type]} · created {formatDateTime(community.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isClosed && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => setIsJoinKitOpen(true)}
              >
                <QrCode className="h-3.5 w-3.5" />
                Join kit
              </Button>
            )}

            {allowed.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === 'APPROVE' || action === 'REACTIVATE' ? 'default' : 'outline'}
                className="text-xs h-8"
                disabled={moderateMutation.isPending}
                onClick={() => {
                  setActionError(null);
                  if (action === 'REJECT') setIsRejecting(true);
                  else moderateMutation.mutate(action);
                }}
              >
                {MODERATION_LABELS[action]}
              </Button>
            ))}
          </div>
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

      {community.status === 'REJECTED' && community.rejectionReason && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300 text-xs">
          <span className="font-medium">Rejected: </span>
          {community.rejectionReason}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              {community.description ?? 'No description has been added yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <Detail label="Join code">
              <span className="font-mono tracking-wider">
                {isClosed ? '—' : community.joinCodeFormatted}
              </span>
            </Detail>
            <Detail label="Members">
              <span className="tabular-nums">{community.memberCount}</span>
            </Detail>
            <Detail label="Accepting members">
              {community.isAcceptingMembers ? (
                <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">No</span>
              )}
            </Detail>
            <Detail label="Location">
              {[community.location.city, community.location.district, community.location.state]
                .filter(Boolean)
                .join(', ') || '—'}
            </Detail>
            <Detail label="PIN code">{community.location.pincode ?? '—'}</Detail>
            <Detail label="Contact">{community.contactEmail ?? community.contactPhone ?? '—'}</Detail>
            <Detail label="Approved">{formatDateTime(community.approvedAt)}</Detail>
            <Detail label="Code last rotated">
              {formatDateTime(community.joinCodeUpdatedAt)}
            </Detail>
            <Detail label="Last updated">{formatDateTime(community.updatedAt)}</Detail>
          </CardContent>
        </Card>

        {/* ── Leader & recruitment ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <LeaderCard community={community} onChanged={invalidate} onError={setActionError} />

          {!isClosed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recruitment</CardTitle>
                <CardDescription>
                  Pause joining without suspending the community — useful the moment a code turns
                  up somewhere it should not have.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={community.isJoinable ? 'outline' : 'default'}
                  size="sm"
                  className="w-full text-xs h-8"
                  disabled={joinableMutation.isPending}
                  onClick={() => {
                    setActionError(null);
                    joinableMutation.mutate(!community.isJoinable);
                  }}
                >
                  {community.isJoinable ? 'Close joining' : 'Open joining'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5 text-zinc-500"
                  disabled={reconcileMutation.isPending}
                  onClick={() => {
                    setActionError(null);
                    reconcileMutation.mutate();
                  }}
                  title="Recount members from the member records"
                >
                  <ArrowsClockwise
                    className={`h-3.5 w-3.5 ${reconcileMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  Recount members
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Members ────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm">Members</CardTitle>
          <CardDescription>
            People who joined with this community&apos;s code. The leader is not listed here — they
            run the community rather than belong to it.
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-medium uppercase text-[10px] border-y border-zinc-200 dark:border-zinc-800">
              <tr>
                <th scope="col" className="px-5 py-3">Name</th>
                <th scope="col" className="px-5 py-3">Phone</th>
                <th scope="col" className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {membersQuery.isPending && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner />
                      <span>Loading members…</span>
                    </div>
                  </td>
                </tr>
              )}

              {membersQuery.isSuccess && (membersQuery.data.items.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-zinc-500">
                    Nobody has joined yet. Share the join code or QR to get started.
                  </td>
                </tr>
              )}

              {(membersQuery.data?.items ?? []).map((member: UserDto) => (
                <tr key={member.id}>
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {member.fullName ?? 'Unnamed member'}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px]">{member.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-[11px] text-zinc-500">
                    {formatDateTime(member.joinedCommunityAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(membersQuery.data?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500">
            <span>
              Page {membersQuery.data?.page ?? memberPage} of {membersQuery.data?.totalPages ?? 1}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={memberPage <= 1 || membersQuery.isFetching}
                onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={
                  memberPage >= (membersQuery.data?.totalPages ?? 1) || membersQuery.isFetching
                }
                onClick={() => setMemberPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      {community.status !== 'ARCHIVED' && (
        <Card className="border-red-200 dark:border-red-900/60">
          <CardHeader className="border-red-100 dark:border-red-900/40">
            <CardTitle className="text-sm text-red-700 dark:text-red-400">Archive</CardTitle>
            <CardDescription>
              Detaches every member, frees the leader and releases the join code back into the pool.
              Anyone scanning an old poster will see &ldquo;community not found&rdquo;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setIsArchiving(true)}
            >
              <Trash className="h-3.5 w-3.5" />
              Archive community
            </Button>
          </CardContent>
        </Card>
      )}

      <JoinKitDialog
        communityId={isJoinKitOpen ? community.id : null}
        communityName={community.name}
        onOpenChange={setIsJoinKitOpen}
      />

      <RejectCommunityDialog
        community={isRejecting ? community : null}
        onOpenChange={(open) => setIsRejecting(open)}
        onRejected={invalidate}
      />

      <Dialog open={isArchiving} onOpenChange={setIsArchiving}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive {community.name}?</DialogTitle>
            <DialogDescription>
              {community.memberCount} member{community.memberCount === 1 ? '' : 's'} will be
              detached and the join code released. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setIsArchiving(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              {archiveMutation.isPending ? 'Archiving…' : 'Archive community'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className="text-zinc-900 dark:text-zinc-100">{children}</div>
    </div>
  );
}

interface LeaderCardProps {
  community: CommunityDto;
  onChanged: () => void;
  onError: (message: string) => void;
}

/**
 * Leader assignment.
 *
 * Only accounts that already hold the `LEADER` role are offered, because the
 * server refuses to promote an account as a side effect of assigning it —
 * granting a role is a separate, separately-audited permission.
 */
function LeaderCard({ community, onChanged, onError }: LeaderCardProps): React.JSX.Element {
  const [selected, setSelected] = useState('');

  const leadersQuery = useQuery({
    queryKey: userKeys.list({ role: 'LEADER', status: 'ACTIVE', pageSize: LEADER_PAGE_SIZE }),
    queryFn: () => usersApi.list({ role: 'LEADER', status: 'ACTIVE', pageSize: LEADER_PAGE_SIZE }),
  });

  const assignMutation = useMutation({
    mutationFn: (leaderId: string) => communitiesApi.assignLeader(community.id, leaderId),
    onSuccess: () => {
      setSelected('');
      onChanged();
    },
    onError: (error: unknown) => onError(errorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: () => communitiesApi.removeLeader(community.id),
    onSuccess: onChanged,
    onError: (error: unknown) => onError(errorMessage(error)),
  });

  const currentLeader = leadersQuery.data?.items.find((u) => u.id === community.leaderId);
  const isClosed = community.status === 'ARCHIVED' || community.status === 'REJECTED';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-1.5">
          <UserCircle className="h-4 w-4" />
          Leader
        </CardTitle>
        <CardDescription>One leader per community, one community per leader.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {community.leaderId ? (
          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {currentLeader?.fullName ?? 'Assigned'}
            </div>
            <div className="font-mono text-[11px] text-zinc-500 truncate">
              {currentLeader?.email ?? community.leaderId}
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">No leader assigned yet.</p>
        )}

        {!isClosed && (
          <>
            <Select
              aria-label="Select a leader"
              value={selected}
              disabled={leadersQuery.isPending}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">
                {community.leaderId ? 'Replace with…' : 'Select a leader…'}
              </option>
              {(leadersQuery.data?.items ?? [])
                .filter((leader) => leader.id !== community.leaderId)
                .map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.fullName ?? leader.email ?? leader.id}
                  </option>
                ))}
            </Select>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-xs h-8"
                disabled={!selected || assignMutation.isPending}
                onClick={() => assignMutation.mutate(selected)}
              >
                {assignMutation.isPending ? 'Assigning…' : 'Assign'}
              </Button>

              {community.leaderId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate()}
                >
                  Remove
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
