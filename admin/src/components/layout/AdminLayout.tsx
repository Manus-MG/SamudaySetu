import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SquaresFour,
  Pulse,
  UsersThree,
  Buildings,
  ShieldCheckered,
  SignOut,
  ShieldCheck,
  Sun,
  Moon,
} from '@phosphor-icons/react';
import { useAuth } from '../../features/auth/AuthContext.tsx';
import { useTheme } from '../../features/theme/ThemeContext.tsx';
import { healthApi, healthKeys } from '../../features/health/health.api.ts';
import { ROLE_LABELS } from '../../api/types.ts';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Spinner } from '../ui/spinner.tsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  /** Rendered but not navigable — the backend module does not exist yet. */
  disabled?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Overview', path: '/', icon: SquaresFour },
  { label: 'System Health', path: '/health', icon: Pulse },
  { label: 'Communities', path: '/communities', icon: Buildings },
  { label: 'Staff & Roles', path: '/users', icon: UsersThree },
  { label: 'Audit Log', path: '/audit', icon: ShieldCheckered },
];

const NAV_BASE =
  'flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Drives the environment chip and the connection dot in the header. Polled
  // slowly: this is an at-a-glance indicator, not a monitoring system.
  const { data: status, isError: isStatusError } = useQuery({
    queryKey: healthKeys.status,
    queryFn: healthApi.status,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const handleLogout = async (): Promise<void> => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const apiOnline = !isStatusError && status !== undefined;
  const apiHealthy = apiOnline && status.status === 'ok';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="w-56 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/70 flex flex-col justify-between p-3 shrink-0">
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 px-2 pt-1">
              <div className="h-8 w-8 rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 flex items-center justify-center font-semibold">
                <ShieldCheck className="h-5 w-5" weight="bold" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Samuday Setu
                </h2>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block -mt-0.5">
                  Admin Portal
                </span>
              </div>
            </div>

            <nav className="space-y-0.5">
              <div className="px-2 pb-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Menu
              </div>

              {NAV_ITEMS.map(({ label, path, icon: Icon, disabled }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `${NAV_BASE} ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={
                            isActive
                              ? 'h-4 w-4 text-zinc-900 dark:text-zinc-100'
                              : 'h-4 w-4 text-zinc-400 dark:text-zinc-500'
                          }
                          weight={isActive ? 'bold' : 'regular'}
                        />
                        <span>{label}</span>
                      </div>
                      {disabled && (
                        <span className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-px">
                          Soon
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* ── Signed-in user ─────────────────────────────────────────────── */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
            {user && (
              <div className="px-2 py-1 space-y-1">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {user.fullName ?? 'Unnamed account'}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate"
                    title={user.email ?? ''}
                  >
                    {user.email}
                  </span>
                  <Badge
                    variant={user.role === 'SUPER_ADMIN' ? 'superAdmin' : 'admin'}
                    className="text-[10px] px-1 py-0 shrink-0"
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
              disabled={isSigningOut}
              className="w-full justify-start text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 text-xs gap-2"
            >
              {isSigningOut ? <Spinner className="h-4 w-4" /> : <SignOut className="h-4 w-4" />}
              <span>{isSigningOut ? 'Signing out…' : 'Sign Out'}</span>
            </Button>
          </div>
        </aside>

        {/* ── Main area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <header className="h-14 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Environment:
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                {status?.environment ?? '—'}
              </span>
              {status?.version && (
                <span className="text-[11px] font-mono text-zinc-400">v{status.version}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                title={apiOnline ? status.dependencies.mongo.detail : 'No response from the API'}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    apiHealthy
                      ? 'bg-emerald-500'
                      : apiOnline
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                />
                <span>{apiHealthy ? 'API healthy' : apiOnline ? 'API degraded' : 'API offline'}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="h-8 px-2.5 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Toggle light / dark mode"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" weight="bold" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-zinc-600" weight="bold" />
                    <span>Dark</span>
                  </>
                )}
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-6xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
};
