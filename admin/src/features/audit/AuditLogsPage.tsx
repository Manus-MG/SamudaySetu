import React, { useState } from 'react';
import {
  ShieldCheckered,
  ShieldCheck,
  Eye,
  FileArrowDown,
  Funnel,
  MagnifyingGlass,
  Key,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Badge } from '../../components/ui/badge.tsx';

interface AuditEntry {
  id: string;
  action: string;
  category: 'TOTP_BREAKGLASS' | 'PII_EXPORT' | 'IMPERSONATION' | 'DPDP_REQUEST' | 'ROLE_ASSIGNMENT';
  actor: string;
  target: string;
  ip: string;
  timestamp: string;
  status: 'SUCCESS' | 'ALERT' | 'BLOCKED';
  details: string;
}

const AUDIT_DATA: AuditEntry[] = [
  {
    id: 'aud_101',
    action: 'SUPER_ADMIN TOTP Verified',
    category: 'TOTP_BREAKGLASS',
    actor: 'superadmin@samudaysetu.gov.in',
    target: 'System Console',
    ip: '103.21.124.8',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleString('en-IN'),
    status: 'SUCCESS',
    details: 'Break-glass session opened with 6-digit TOTP validation.',
  },
  {
    id: 'aud_102',
    action: 'Member Export Volume Alert (>5,000 Rows)',
    category: 'PII_EXPORT',
    actor: 'leader_up_east@samudaysetu.in',
    target: 'BJP Pradesh Sangathan (UP East)',
    ip: '49.36.88.12',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toLocaleString('en-IN'),
    status: 'ALERT',
    details: 'Watermarked export generated. Automated security alert emitted (ARCHITECTURE.md §2.3).',
  },
  {
    id: 'aud_103',
    action: 'Time-Boxed Support Impersonation Granted',
    category: 'IMPERSONATION',
    actor: 'siddharth.support@samudaysetu.in',
    target: 'All India Gupta Samaj Trust (tnt_gupta_samaj)',
    ip: '103.21.124.8',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toLocaleString('en-IN'),
    status: 'SUCCESS',
    details: '60-minute time-boxed tenant owner approved session with persistent banner.',
  },
  {
    id: 'aud_104',
    action: 'DPDP Data Principal Erasure Request',
    category: 'DPDP_REQUEST',
    actor: 'compliance@samudaysetu.in',
    target: 'User #usr_99812 (Phone: +9198******10)',
    ip: '103.21.124.8',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toLocaleString('en-IN'),
    status: 'SUCCESS',
    details: 'Tenant-scoped MemberProfile PII erased per DPDP mandate.',
  },
  {
    id: 'aud_105',
    action: 'Role Escalation Attempt Blocked',
    category: 'ROLE_ASSIGNMENT',
    actor: 'ananya.ops@samudaysetu.in',
    target: 'Attempted SUPER_ADMIN grant',
    ip: '182.72.94.10',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toLocaleString('en-IN'),
    status: 'BLOCKED',
    details: 'Privilege escalation guard prevented ADMIN from self-promoting to SUPER_ADMIN.',
  },
];

export function AuditLogsPage(): React.JSX.Element {
  const [logs] = useState<AuditEntry[]>(AUDIT_DATA);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.target.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || l.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheckered className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Audit Ledger & Compliance Log
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Audit log for break-glass actions, PII exports, support access & DPDP erasures
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search actions, actor email, IP..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Funnel className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="ALL">All Categories</option>
              <option value="TOTP_BREAKGLASS">TOTP Break-Glass</option>
              <option value="PII_EXPORT">PII Export Alerts</option>
              <option value="IMPERSONATION">Support Impersonation</option>
              <option value="DPDP_REQUEST">DPDP Compliance</option>
              <option value="ROLE_ASSIGNMENT">Role Escalation</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-medium uppercase text-[10px] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3">Action & Event</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Target Context</th>
                <th className="px-5 py-3">IP & Timestamp</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-1.5 font-medium">
                      {l.category === 'TOTP_BREAKGLASS' && <Key className="h-3.5 w-3.5 text-amber-500" />}
                      {l.category === 'PII_EXPORT' && <FileArrowDown className="h-3.5 w-3.5 text-red-500" />}
                      {l.category === 'IMPERSONATION' && <Eye className="h-3.5 w-3.5 text-blue-500" />}
                      {l.category === 'DPDP_REQUEST' && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                      {l.action}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-normal mt-0.5">{l.details}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px]">
                    {l.actor}
                  </td>
                  <td className="px-5 py-3 text-[11px]">
                    {l.target}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-zinc-500">
                    <div>{l.timestamp}</div>
                    <div className="text-[10px]">IP: {l.ip}</div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge
                      variant={
                        l.status === 'SUCCESS'
                          ? 'active'
                          : l.status === 'ALERT'
                          ? 'pending'
                          : 'suspended'
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {l.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
