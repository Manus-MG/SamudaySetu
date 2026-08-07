import React, { useState } from 'react';
import {
  Buildings,
  Plus,
  MagnifyingGlass,
  Eye,
  Users,
  Funnel,
} from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthContext.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
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

interface TenantRecord {
  id: string;
  name: string;
  type: 'SAMAJ' | 'POLITICAL' | 'RWA' | 'ALUMNI';
  ownerName: string;
  ownerEmail: string;
  membersCount: number;
  spanCap: number;
  topTitle: string;
  bottomTitle: string;
  createdAt: string;
}

const INITIAL_TENANTS: TenantRecord[] = [
  {
    id: 'tnt_gupta_samaj',
    name: 'All India Gupta Samaj Trust',
    type: 'SAMAJ',
    ownerName: 'Ramprasad Gupta',
    ownerEmail: 'president@guptasamaj.org',
    membersCount: 450210,
    spanCap: 50,
    topTitle: 'Rashtriya Adhyaksh',
    bottomTitle: 'Panna Pramukh',
    createdAt: '2026-01-10',
  },
  {
    id: 'tnt_bjp_up_east',
    name: 'BJP Pradesh Sangathan (UP East)',
    type: 'POLITICAL',
    ownerName: 'Mahendra Nath Singh',
    ownerEmail: 'itcell@bjp-upeast.in',
    membersCount: 720100,
    spanCap: 30,
    topTitle: 'Rashtriya Adhyaksh',
    bottomTitle: 'Booth Pramukh',
    createdAt: '2026-01-15',
  },
  {
    id: 'tnt_gokuldham_rwa',
    name: 'Gokuldham Federation RWA',
    type: 'RWA',
    ownerName: 'Aatmaram Bhide',
    ownerEmail: 'secretary@gokuldham.rwa',
    membersCount: 4500,
    spanCap: 10,
    topTitle: 'President',
    bottomTitle: 'Resident',
    createdAt: '2026-02-01',
  },
  {
    id: 'tnt_iitk_alumni',
    name: 'IIT Kanpur Alumni Network',
    type: 'ALUMNI',
    ownerName: 'Dr. Alok Agarwal',
    ownerEmail: 'president@iitkalumni.org',
    membersCount: 105640,
    spanCap: 100,
    topTitle: 'President',
    bottomTitle: 'Alumnus',
    createdAt: '2026-02-03',
  },
];

export function TenantsPage(): React.JSX.Element {
  const { startImpersonation } = useAuth();
  const [tenants, setTenants] = useState<TenantRecord[]>(INITIAL_TENANTS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newType, setNewType] = useState<'SAMAJ' | 'POLITICAL' | 'RWA' | 'ALUMNI'>('SAMAJ');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newSpanCap, setNewSpanCap] = useState(30);

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const created: TenantRecord = {
      id: 'tnt_' + Math.random().toString(36).substring(2, 9),
      name: newTenantName,
      type: newType,
      ownerName: newOwnerName,
      ownerEmail: newOwnerEmail,
      membersCount: 1,
      spanCap: newSpanCap,
      topTitle: newType === 'RWA' ? 'President' : newType === 'ALUMNI' ? 'President' : 'Rashtriya Adhyaksh',
      bottomTitle: newType === 'RWA' ? 'Resident' : newType === 'ALUMNI' ? 'Alumnus' : 'Booth Pramukh',
      createdAt: new Date().toISOString().split('T')[0] ?? new Date().toISOString(),
    };

    setTenants([created, ...tenants]);
    setIsModalOpen(false);
    setNewTenantName('');
    setNewOwnerName('');
    setNewOwnerEmail('');
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Buildings className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Tenant Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Multi-tenant community provisioning with designation levels & span caps (ARCHITECTURE.md §2.2)
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              Provision New Tenant
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Provision New Tenant</DialogTitle>
              <DialogDescription>
                Seed tenant template, designation ladder, and initial owner account.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTenant} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Community Name</label>
                <Input
                  placeholder="e.g. Maharashtra Kshatriya Samaj"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Tenant Template</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="SAMAJ">Samaj / Cultural Trust (Rashtriya → Panna Pramukh)</option>
                  <option value="POLITICAL">Political Sangathan (Rashtriya → Booth Pramukh)</option>
                  <option value="RWA">RWA / Housing Federation (President → Resident)</option>
                  <option value="ALUMNI">Alumni Association (President → Alumnus)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Owner Name</label>
                  <Input
                    placeholder="Owner Full Name"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Owner Email</label>
                  <Input
                    type="email"
                    placeholder="owner@domain.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex justify-between">
                  <span>Level Span Cap</span>
                  <span className="font-mono text-zinc-600 dark:text-zinc-400">{newSpanCap} direct reports</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={newSpanCap}
                  onChange={(e) => setNewSpanCap(Number(e.target.value))}
                  className="w-full accent-zinc-800 dark:accent-zinc-200"
                />
              </div>

              <DialogFooter>
                <Button type="submit" size="sm" className="w-full h-9 text-xs">
                  Create Tenant & Seed Template
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search Bar */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search name or email..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Funnel className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">Template:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="ALL">All Templates</option>
              <option value="SAMAJ">Samaj</option>
              <option value="POLITICAL">Political</option>
              <option value="RWA">RWA</option>
              <option value="ALUMNI">Alumni</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTenants.map((t) => (
          <Card key={t.id} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-0.5">
                <CardTitle className="text-sm">{t.name}</CardTitle>
                <div className="text-[11px] text-zinc-400 font-mono">ID: {t.id}</div>
              </div>
              <Badge
                variant={
                  t.type === 'SAMAJ'
                    ? 'superAdmin'
                    : t.type === 'POLITICAL'
                    ? 'active'
                    : 'default'
                }
                className="text-[10px] px-1.5 py-0"
              >
                {t.type}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/80 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Owner Account:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{t.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Owner Email:</span>
                  <span className="font-mono">{t.ownerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Designation Ladder:</span>
                  <span>{t.topTitle} → {t.bottomTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Span Cap:</span>
                  <span className="font-mono">{t.spanCap} max</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <Users className="h-4 w-4 text-zinc-400" />
                  <span><strong>{t.membersCount.toLocaleString()}</strong> Members</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startImpersonation(t.id, t.name)}
                  className="text-xs h-7 gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Support Access
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
