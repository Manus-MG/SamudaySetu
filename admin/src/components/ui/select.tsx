import * as React from 'react';
import { cn } from '../../lib/utils.ts';

/**
 * A styled native `<select>`.
 *
 * Deliberately not a Radix listbox: these are short, static option sets, and the
 * native control gets keyboard behaviour, mobile pickers and form semantics for
 * free.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
