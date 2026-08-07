import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UsersThree,
  UserPlus,
  MagnifyingGlass,
  Pencil,
  WarningCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { get, post, patch } from '../../api/client.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '../../components/ui/dialog.tsx';

export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'LEADER' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt?: string;
}

interface ListUsersResponse {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
}

const DEFAULT_STAFF_USERS: UserItem[] = [
  {
    id: '6a75afcaf5156221161f71b1',
    fullName: 'Vikramaditya Sharma',
    email: 'superadmin@samudaysetu.gov.in',
    phone: '+919876543210',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
  },
  {
    id: 'usr_platform_ops_02',
    fullName: 'Ananya Deshmukh',
    email: 'ananya.ops@samudaysetu.in',
    phone: '+919812345678',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-05',
  },
  {
    id: 'usr_leader_03',
    fullName: 'Rajesh Kumar Gupta',
    email: 'rajesh.gupta@samudaysetu.in',
    phone: '+919765432109',
    role: 'LEADER',
    status: 'ACTIVE',
    createdAt: '2026-01-20',
  },
  {
    id: 'usr_staff_04',
    fullName: 'Siddharth Varma',
    email: 'siddharth.support@samudaysetu.in',
    phone: '+919654321098',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-02-02',
  },
];

export function StaffUsersPage(): React.JSX.Element {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Create Staff Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'LEADER'>('ADMIN');
  const [createError, setCreateError] = useState<string | null>(null);

  // Role Edit Modal state
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [targetRole, setTargetRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'LEADER' | 'USER'>('ADMIN');

  // Query users from Backend API
  const { data: apiData, refetch, isRefetching } = useQuery({
    queryKey: ['users-list', search, roleFilter],
    queryFn: async () => {
      try {
        const params: Record<string, unknown> = {};
        if (search) params['search'] = search;
        if (roleFilter !== 'ALL') params['role'] = roleFilter;
        return await get<ListUsersResponse>('/users', params);
      } catch {
        return null;
      }
    },
  });

  const usersList = apiData?.users?.length ? apiData.users : DEFAULT_STAFF_USERS;

  // Mutations for real API calls
  const createMutation = useMutation({
    mutationFn: (body: any) => post<UserItem>('/users', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsCreateOpen(false);
      setNewEmail('');
      setNewName('');
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.error?.message || 'Failed to create user on backend.');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      patch<UserItem>(`/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setEditingUser(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch<UserItem>(`/users/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
  });

  // Privilege escalation check (roles.ts: SUPER_ADMIN = 0, ADMIN = 1, LEADER = 2, USER = 3)
  const roleRank = { SUPER_ADMIN: 0, ADMIN: 1, LEADER: 2, USER: 3 };
  const currentRank = currentUser ? roleRank[currentUser.role] : 3;

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Prevent privilege escalation
    if (roleRank[newRole] <= currentRank && currentUser?.role !== 'SUPER_ADMIN') {
      setCreateError('Privilege Escalation Guard: You can only create staff roles strictly below your own rank.');
      return;
    }

    createMutation.mutate({
      email: newEmail,
      fullName: newName,
      phone: newPhone || undefined,
      role: newRole,
      password: 'Password@12345',
    });
  };

  const handleSaveRole = () => {
    if (!editingUser) return;
    roleMutation.mutate({ id: editingUser.id, role: targetRole });
  };

  const handleToggleStatus = (u: UserItem) => {
    const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    statusMutation.mutate({ id: u.id, status: nextStatus });
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <UsersThree className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Staff & RBAC User Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Assign staff roles (`SUPER_ADMIN`, `ADMIN`, `LEADER`, `USER`) with privilege-escalation guardrails
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 text-xs h-8"
          >
            <ArrowsClockwise className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Sync API
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="gap-1.5 text-xs h-8">
                <UserPlus className="h-4 w-4" />
                Create Staff Account
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Staff Account</DialogTitle>
                <DialogDescription>
                  Staff accounts sign in with Email + Password + 2FA TOTP.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateStaff} className="space-y-3.5 pt-2">
                {createError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-center gap-2">
                    <WarningCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                  <Input
                    placeholder="e.g. Priyesh Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
                  <Input
                    type="email"
                    placeholder="name@samudaysetu.in"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Phone</label>
                    <Input
                      placeholder="+919876543210"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Initial Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="ADMIN">ADMIN (Platform Ops)</option>
                      <option value="LEADER">LEADER (Regional Lead)</option>
                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Break-Glass)</option>
                      )}
                    </select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" size="sm" className="w-full h-9 text-xs" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create Staff Account'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-500">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="LEADER">LEADER</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-medium uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3">Staff User</th>
                <th className="px-5 py-3">Contact Phone</th>
                <th className="px-5 py-3">Assigned Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{u.fullName}</div>
                    <div className="text-[11px] font-mono text-zinc-400">{u.email}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px]">
                    {u.phone ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={
                        u.role === 'SUPER_ADMIN'
                          ? 'superAdmin'
                          : u.role === 'ADMIN'
                          ? 'admin'
                          : u.role === 'LEADER'
                          ? 'leader'
                          : 'user'
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={u.status === 'ACTIVE' ? 'active' : 'suspended'} className="text-[10px] px-1.5 py-0">
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right space-x-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingUser(u);
                        setTargetRole(u.role);
                      }}
                      className="text-xs h-7 px-2"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Role
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(u)}
                      className={`text-xs h-7 px-2 ${
                        u.status === 'ACTIVE'
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Edit Modal */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Role: {editingUser.fullName}</DialogTitle>
              <DialogDescription>
                Role updates invalidate active Redis session tokens instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <div>Email: <strong>{editingUser.email}</strong></div>
                <div>Current Role: <Badge variant="admin" className="text-[10px]">{editingUser.role}</Badge></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">New Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="ADMIN">ADMIN (Platform Management)</option>
                  <option value="LEADER">LEADER (Regional Lead)</option>
                  <option value="USER">USER (Standard Access)</option>
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Break-Glass Only)</option>
                  )}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSaveRole} size="sm" className="w-full h-9 text-xs" disabled={roleMutation.isPending}>
                {roleMutation.isPending ? 'Updating…' : 'Update Staff Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
