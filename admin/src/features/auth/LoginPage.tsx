import React, { useState } from 'react';
import {
  ShieldCheck,
  LockKey,
  EnvelopeSimple,
  Key,
  ArrowRight,
  Sun,
  Moon,
} from '@phosphor-icons/react';
import { useAuth } from './AuthContext.tsx';
import { useTheme } from '../theme/ThemeContext.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.tsx';

export function LoginPage(): React.JSX.Element {
  const { login, quickDevLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('superadmin@samudaysetu.gov.in');
  const [password, setPassword] = useState('••••••••••••');
  const [totp, setTotp] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password, totp);
      window.location.href = '/';
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Sign in failed. Check credentials and TOTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDev = (role: 'SUPER_ADMIN' | 'ADMIN') => {
    quickDevLogin(role);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 relative transition-colors">
      {/* Light / Dark Mode Toggle Top Right */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="h-8 px-2.5 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-zinc-600" />
              <span>Dark Mode</span>
            </>
          )}
        </Button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 mb-1">
            <ShieldCheck className="h-6 w-6" weight="bold" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Samuday Setu
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Admin Console Sign In
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="space-y-1 pb-3 text-center">
            <CardTitle className="text-base font-semibold">Staff Sign In</CardTitle>
            <CardDescription className="text-xs">
              Email + Password + Mandatory 2FA TOTP
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 space-y-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs">
                  {error}
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <EnvelopeSimple className="h-3.5 w-3.5 text-zinc-400" />
                  Work Email
                </label>
                <Input
                  type="email"
                  placeholder="admin@samudaysetu.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password field */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <LockKey className="h-3.5 w-3.5 text-zinc-400" />
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* TOTP 2FA field */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-zinc-400" />
                    2FA TOTP Code
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">6 DIGITS</span>
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="font-mono text-center tracking-widest"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9 text-xs font-medium gap-1.5 mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Dev Sign-In Panel */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center font-medium">
                Quick Dev Sandbox:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDev('SUPER_ADMIN')}
                  className="text-xs"
                >
                  Super Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDev('ADMIN')}
                  className="text-xs"
                >
                  Platform Ops
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-zinc-400">
          AES-256 GCM · Audit Logged · DPDP Compliant
        </p>
      </div>
    </div>
  );
}
