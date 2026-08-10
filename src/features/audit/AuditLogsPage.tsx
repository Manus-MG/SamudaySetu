import React from 'react';
import { ShieldCheckered } from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card.tsx';

/**
 * Placeholder. There is no audit module in the backend yet, so this page shows
 * what is planned rather than inventing entries — a fabricated audit trail is
 * worse than an absent one.
 */
const PLANNED = [
  'Sign-in attempts, successes and failures, with IP and device',
  'Role grants and revocations, including the actor who made them',
  'Account suspensions, reactivations and deletions',
  'Session revocations, both self-service and administrative',
  'Bulk reads and exports of member data (DPDP obligation)',
] as const;

export function AuditLogsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ShieldCheckered className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
          Audit Log
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Not built yet — the backend has no audit module.
        </p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="h-11 w-11 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <ShieldCheckered className="h-6 w-6 text-zinc-400" />
          </div>

          <div className="space-y-1 max-w-md">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Coming soon</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              This screen stays empty until the API can serve real records. Once the audit module
              lands, it will cover:
            </p>
          </div>

          <ul className="text-left text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 max-w-md w-full">
            {PLANNED.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
