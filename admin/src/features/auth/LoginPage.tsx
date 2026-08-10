import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LockKey, EnvelopeSimple, ArrowRight, Sun, Moon } from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import { useAuth } from './AuthContext.tsx';
import { useTheme } from '../theme/ThemeContext.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card.tsx';

interface LocationState {
  from?: string;
}

export function LoginPage(): React.JSX.Element {
  const { login, status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already signed in — send them where they were headed, or to the dashboard.
  if (status === 'authenticated') {
    const from = (location.state as LocationState | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      const from = (location.state as LocationState | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 relative transition-colors">
      <div className="absolute top-4 right-4">
        <Button
          type="button"
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

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 mb-1">
            <ShieldCheck className="h-6 w-6" weight="bold" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Samuday Setu
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Admin Console Sign In</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="space-y-1 pb-3 text-center">
            <CardTitle className="text-base font-semibold">Staff Sign In</CardTitle>
            <CardDescription className="text-xs">
              Super Admin and Admin accounts only
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {error && (
                <div
                  role="alert"
                  className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="login-email"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
                >
                  <EnvelopeSimple className="h-3.5 w-3.5 text-zinc-400" />
                  Work Email
                </label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="login-password"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
                >
                  <LockKey className="h-3.5 w-3.5 text-zinc-400" />
                  Password
                </label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9 text-xs font-medium gap-1.5 mt-2"
                disabled={isSubmitting || email.length === 0 || password.length === 0}
              >
                {isSubmitting ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-zinc-400">
          Sessions expire after 15 minutes of token life and renew automatically.
        </p>
      </div>
    </div>
  );
}
