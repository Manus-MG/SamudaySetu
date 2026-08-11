import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UsersThree,
  UserPlus,
  MagnifyingGlass,
  Pencil,
  WarningCircle,
  ArrowsClockwise,
  Trash,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  canAssignRole,
  outranks,
  ROLES,
  ROLE_LABELS,
  STATUS_LABELS,
  USER_STATUSES,
  type ListUsersParams,
  type Role,
  type SettableUserStatus,
  type UserDto,
  type UserStatus,
} from '../../api/types.ts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { userKeys, usersApi } from './users.api.ts';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Select } from '../../components/ui/select.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog.tsx';

const PAGE_SIZE = 20;
/** Mirrors `passwordSchema` on the server. */
const MIN_PASSWORD_LENGTH = 12;

type RoleFilter = Role | 'ALL';
type StatusFilter = UserStatus | 'ALL';

const ROLE_BADGE: Readonly<Record<Role, 'superAdmin' | 'admin' | 'leader' | 'user'>> = {
  SUPER_ADMIN: 'superAdmin',
  ADMIN: 'admin',
  LEADER: 'leader',
  USER: 'user',
};

const STATUS_BADGE: Readonly<
  Record<UserStatus, 'active' | 'suspended' | 'pending' | 'destructive'>
> = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING_PROFILE: 'pending',
  DELETED: 'destructive',
};

/** A password that satisfies the server's length rule without a round-trip. */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('');
}

const formatDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

export function StaffUsersPage(): React.JSX.Element {
  const { user: actor } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 350);

  // Filtering and paging happen on the server; the client never slices a page of
  // results locally, which would silently hide rows beyond the first page.
  const params = useMemo<ListUsersParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(search.length > 0 ? { search } : {}),
      ...(roleFilter !== 'ALL' ? { role: roleFilter } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }),
    [page, search, roleFilter, statusFilter],
  );

  const usersQuery = useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.list(params),
    placeholderData: (previous) => previous,
  });

  const invalidateUsers = (): void => {
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
  };

  // ── Dialog state ───────────────────────────────────────────────────────────

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [editingRole, setEditingRole] = useState<Role>('LEADER');
  const [editingError, setEditingError] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserDto | null>(null);

  const openRoleDialog = (target: UserDto): void => {
    setEditingUser(target);
    setEditingRole(target.role);
    setEditingError(null);
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usersApi.assignRole(id, role),
    onSuccess: () => {
      setEditingUser(null);
      invalidateUsers();
    },
    onError: (error: unknown) => setEditingError(errorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SettableUserStatus }) =>
      usersApi.setStatus(id, status),
    onSuccess: invalidateUsers,
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      setDeletingUser(null);
      invalidateUsers();
    },
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  /** Roles the signed-in actor is allowed to grant. Empty for anyone but staff. */
  const assignableRoles = useMemo<readonly Role[]>(
    () => (actor ? ROLES.filter((role) => canAssignRole(actor.role, role)) : []),
    [actor],
  );

  /**
   * Mirrors `assertMayActOn` on the server: no acting on yourself, and no acting
   * on a peer or a superior. The server enforces this too — this only keeps the
   * UI from offering buttons that are guaranteed to fail.
   */
  const canActOn = (target: UserDto): boolean =>
    actor !== null && actor.id !== target.id && outranks(actor.role, target.role);

  const users = usersQuery.data?.items ?? [];
  const totalPages = usersQuery.data?.totalPages ?? 1;
  const total = usersQuery.data?.total ?? 0;

  const resetToFirstPage = (): void => setPage(1);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <UsersThree className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Users & Roles
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {total} account{total === 1 ? '' : 's'} · you can only manage accounts ranked below
            your own
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void usersQuery.refetch()}
            disabled={usersQuery.isFetching}
            className="gap-1.5 text-xs h-8"
          >
            <ArrowsClockwise
              className={`h-3.5 w-3.5 ${usersQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          {assignableRoles.length > 0 && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <UserPlus className="h-4 w-4" />
              Create Staff Account
            </Button>
          )}
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
              placeholder="Search by name, email or phone…"
              aria-label="Search users"
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
              aria-label="Filter by role"
              className="w-40"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as RoleFilter);
                resetToFirstPage();
              }}
            >
              <option value="ALL">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by status"
              className="w-40"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                resetToFirstPage();
              }}
            >
              <option value="ALL">All statuses</option>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
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
                <th scope="col" className="px-5 py-3">User</th>
                <th scope="col" className="px-5 py-3">Phone</th>
                <th scope="col" className="px-5 py-3">Role</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3">Last sign-in</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {usersQuery.isPending && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner />
                      <span>Loading users…</span>
                    </div>
                  </td>
                </tr>
              )}

              {usersQuery.isError && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-red-600 dark:text-red-400">
                    {errorMessage(usersQuery.error)}
                  </td>
                </tr>
              )}

              {usersQuery.isSuccess && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    No users match these filters.
                  </td>
                </tr>
              )}

              {users.map((row) => {
                const actionable = canActOn(row);
                const isSelf = actor?.id === row.id;
                const isBusy =
                  (statusMutation.isPending && statusMutation.variables?.id === row.id) ||
                  (deleteMutation.isPending && deleteMutation.variables === row.id);

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {row.fullName ?? '—'}
                        {isSelf && <span className="ml-1.5 text-[10px] text-zinc-400">(you)</span>}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">{row.email ?? '—'}</div>
                    </td>

                    <td className="px-5 py-3 font-mono text-[11px]">{row.phone ?? '—'}</td>

                    <td className="px-5 py-3">
                      <Badge variant={ROLE_BADGE[row.role]} className="text-[10px] px-1.5 py-0">
                        {ROLE_LABELS[row.role]}
                      </Badge>
                    </td>

                    <td className="px-5 py-3">
                      <Badge variant={STATUS_BADGE[row.status]} className="text-[10px] px-1.5 py-0">
                        {STATUS_LABELS[row.status]}
                      </Badge>
                    </td>

                    <td className="px-5 py-3 text-[11px] text-zinc-500">
                      {formatDate(row.lastLoginAt)}
                    </td>

                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {row.status === 'DELETED' ? (
                        <span className="text-[11px] text-zinc-400">Deleted</span>
                      ) : !actionable ? (
                        <span className="text-[11px] text-zinc-400">
                          {isSelf ? 'Your account' : 'Outranks you'}
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => openRoleDialog(row)}
                            className="text-xs h-7 px-2"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Role
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => {
                              setActionError(null);
                              statusMutation.mutate({
                                id: row.id,
                                status: row.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                              });
                            }}
                            className={`text-xs h-7 px-2 ${
                              row.status === 'SUSPENDED'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {row.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => {
                              setActionError(null);
                              setDeletingUser(row);
                            }}
                            aria-label={`Delete ${row.fullName ?? row.email ?? 'user'}`}
                            className="text-xs h-7 px-2 text-red-600 dark:text-red-400"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500">
            <span>
              Page {usersQuery.data?.page ?? page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1 || usersQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <CaretLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= totalPages || usersQuery.isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <CaretRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateStaffDialog
        open={isCreateOpen}
        assignableRoles={assignableRoles}
        onOpenChange={setIsCreateOpen}
        onCreated={invalidateUsers}
      />

      {/* ── Change role ────────────────────────────────────────────────────── */}
      <Dialog
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Changing a role revokes every active session for that account immediately.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-3 py-2">
              {editingError && (
                <div
                  role="alert"
                  className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs"
                >
                  {editingError}
                </div>
              )}

              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {editingUser.fullName ?? '—'}
                </div>
                <div className="font-mono text-[11px] text-zinc-500">{editingUser.email ?? '—'}</div>
                <div className="pt-1">
                  Current role:{' '}
                  <Badge variant={ROLE_BADGE[editingUser.role]} className="text-[10px]">
                    {ROLE_LABELS[editingUser.role]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="new-role"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  New role
                </label>
                <Select
                  id="new-role"
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value as Role)}
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              className="w-full h-9 text-xs"
              disabled={
                roleMutation.isPending ||
                editingUser === null ||
                editingRole === editingUser.role
              }
              onClick={() => {
                if (!editingUser) return;
                setEditingError(null);
                roleMutation.mutate({ id: editingUser.id, role: editingRole });
              }}
            >
              {roleMutation.isPending ? 'Updating…' : 'Update role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <Dialog
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              Personal details are erased and every session is revoked. A tombstone row is kept so
              audit trails stay intact. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingUser && (
            <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {deletingUser.fullName ?? '—'}
              </div>
              <div className="font-mono text-[11px] text-zinc-500">
                {deletingUser.email ?? deletingUser.phone ?? '—'}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setDeletingUser(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingUser) deleteMutation.mutate(deletingUser.id);
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Create staff dialog ──────────────────────────────────────────────────────

interface CreateStaffDialogProps {
  open: boolean;
  assignableRoles: readonly Role[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/**
 * Split out so its form state is created and destroyed with the dialog. Keeping
 * it in the page would leave a half-typed password in memory after closing.
 */
function CreateStaffDialog({
  open,
  assignableRoles,
  onOpenChange,
  onCreated,
}: CreateStaffDialogProps): React.JSX.Element {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(assignableRoles[0] ?? 'LEADER');
  const [error, setError] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{ email: string; password: string } | null>(
    null,
  );

  const reset = (): void => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole(assignableRoles[0] ?? 'LEADER');
    setError(null);
    setCreatedSummary(null);
  };

  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: (created) => {
      // Shown once, right here: the server stores only the hash, so this is the
      // last moment the password can be handed to the new user.
      setCreatedSummary({ email: created.email ?? email, password });
      onCreated();
    },
    onError: (caught: unknown) => setError(errorMessage(caught)),
  });

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    // Leaders work in the mobile app, which has no password login — without a
    // phone they would have a working account and no way to reach it.
    if (role === 'LEADER' && phone.trim().length === 0) {
      setError('A leader signs in to the mobile app by phone, so a phone number is required.');
      return;
    }

    mutation.mutate({
      email: email.trim(),
      fullName: fullName.trim(),
      password,
      role,
      ...(phone.trim().length > 0 ? { phone: phone.trim() } : {}),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create staff account</DialogTitle>
          <DialogDescription>
            Staff sign in with email and password. Members are created automatically when they
            verify an OTP in the mobile app.
          </DialogDescription>
        </DialogHeader>

        {createdSummary ? (
          <div className="space-y-3 py-2">
            <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-200 text-xs space-y-2">
              <p className="font-medium">Account created.</p>
              <p>Share these credentials now — the password cannot be shown again.</p>
              <div className="font-mono text-[11px] break-all space-y-1 pt-1">
                <div>{createdSummary.email}</div>
                <div>{createdSummary.password}</div>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full h-9 text-xs"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2" noValidate>
            {error && (
              <div
                role="alert"
                className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-start gap-2"
              >
                <WarningCircle className="h-4 w-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="new-name" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Full name
              </label>
              <Input
                id="new-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="new-email" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <Input
                id="new-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="new-phone" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Phone{' '}
                  <span className={role === 'LEADER' ? 'text-amber-600' : 'text-zinc-400'}>
                    {role === 'LEADER' ? '(required)' : '(optional)'}
                  </span>
                </label>
                <Input
                  id="new-phone"
                  inputMode="tel"
                  placeholder="9876543210"
                  required={role === 'LEADER'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="new-role" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Role
                </label>
                <Select id="new-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {assignableRoles.map((option) => (
                    <option key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {role === 'LEADER' && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Leaders sign in to the mobile app with this phone number and an OTP. The password
                below only exists so the account can be upgraded to Admin later.
              </p>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-password"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password <span className="text-zinc-400">(min {MIN_PASSWORD_LENGTH})</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="text-[11px] text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Generate
                </button>
              </div>
              <Input
                id="new-password"
                type="text"
                autoComplete="new-password"
                className="font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Creating…' : 'Create account'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
