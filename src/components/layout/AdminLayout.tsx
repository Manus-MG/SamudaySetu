import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  SquaresFour,
  Pulse,
  Buildings,
  UsersThree,
  ShieldCheckered,
  SignOut,
  ShieldCheck,
  Eye,
  CheckCircle,
  Sun,
  Moon,
} from '@phosphor-icons/react';
import { useAuth } from '../../features/auth/AuthContext.tsx';
import { useTheme } from '../../features/theme/ThemeContext.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/', icon: SquaresFour },
  { label: 'Infrastructure', path: '/health', icon: Pulse, badge: 'Live' },
  { label: 'Tenants', path: '/tenants', icon: Buildings },
  { label: 'Staff & Roles', path: '/users', icon: UsersThree },
  { label: 'Audit Ledger', path: '/audit', icon: ShieldCheckered },
];

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, impersonation, stopImpersonation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* ── Persistent Impersonation Banner (ARCHITECTURE.md §2.1) ───────────────── */}
      {impersonation && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 dark:bg-amber-950/80 dark:border-amber-900/60 dark:text-amber-200 px-4 py-1.5 text-xs flex items-center justify-between font-medium sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" weight="bold" />
            <span>
              <strong>Support Access Active:</strong> Inspecting tenant <em>{impersonation.tenantName}</em> ({impersonation.tenantId}).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={stopImpersonation}
            className="h-6 text-[11px] border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            End Support Session
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Minimal Sidebar Navigation ────────────────────────────────────── */}
        <aside className="w-56 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/70 flex flex-col justify-between p-3 shrink-0">
          <div className="space-y-5">
            {/* Header branding */}
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

            {/* Navigation links */}
            <nav className="space-y-0.5">
              <div className="px-2 pb-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Menu
              </div>
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent
                        className={`h-4 w-4 ${
                          isActive
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                        weight={isActive ? 'bold' : 'regular'}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User & Logout */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
            {user && (
              <div className="px-2 py-1 space-y-1">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {user.fullName}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-[100px]">
                    {user.email}
                  </span>
                  <Badge variant={user.role === 'SUPER_ADMIN' ? 'superAdmin' : 'admin'} className="text-[10px] px-1 py-0">
                    {user.role}
                  </Badge>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 text-xs gap-2"
            >
              <SignOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </aside>

        {/* ── Main Content Area ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Minimal Top Header */}
          <header className="h-14 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Environment:
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                development
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* TOTP Verified Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                <span>2FA Active</span>
              </div>

              {/* Light / Dark Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="h-8 px-2.5 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Toggle Light / Dark Mode"
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

          {/* Page Body */}
          <main className="flex-1 p-6 space-y-6 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
