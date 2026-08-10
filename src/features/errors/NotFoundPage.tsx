import React from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '../../components/ui/button.tsx';

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 text-center">
      <div className="space-y-1">
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">404</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          That page does not exist in the admin console.
        </p>
      </div>
      <Link to="/" className={buttonVariants({ size: 'sm' })}>
        Back to dashboard
      </Link>
    </div>
  );
}
