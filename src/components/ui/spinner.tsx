import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '../../lib/utils.ts';

export function Spinner({ className }: { className?: string }): React.JSX.Element {
  return (
    <CircleNotch
      aria-hidden="true"
      className={cn('h-4 w-4 animate-spin text-zinc-400', className)}
    />
  );
}

/** Full-viewport loading state, used while a session is being restored. */
export function FullPageSpinner({ label }: { label?: string }): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-zinc-50 dark:bg-zinc-950"
    >
      <Spinner className="h-6 w-6" />
      {label && <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>}
    </div>
  );
}
