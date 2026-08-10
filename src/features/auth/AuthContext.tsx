import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setSessionExpiredHandler } from '../../api/client.ts';
import { ApiError, ErrorCode } from '../../api/errors.ts';
import { tokenStore } from '../../api/tokenStore.ts';
import { isStaffRole, type Role, type UserDto } from '../../api/types.ts';
import { authApi } from './auth.api.ts';

/**
 * `loading` is a distinct state on purpose. On a hard refresh the user is neither
 * signed in nor signed out until `/users/me` answers; collapsing that into
 * "signed out" bounces the user to the login screen on every reload.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: UserDto | null;
  isAuthenticated: boolean;
  /** Convenience for guards; `null` while loading or signed out. */
  role: Role | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the current user, e.g. after changing your own profile. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NOT_STAFF_MESSAGE =
  'This account does not have access to the admin console. Only Super Admin and Admin accounts can sign in here.';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserDto | null>(null);
  // Start in `loading` only when there is something to restore; otherwise the
  // login screen would flash a spinner for no reason.
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.hasSession() ? 'loading' : 'unauthenticated',
  );

  const clearSession = useCallback((): void => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
    // Cached rows belong to the account that just left. Reset rather than
    // invalidate: invalidated data is still readable until the refetch lands.
    queryClient.clear();
  }, [queryClient]);

  // ── Restore the session on load ────────────────────────────────────────────
  useEffect(() => {
    if (!tokenStore.hasSession()) return;

    let cancelled = false;

    void (async () => {
      try {
        const me = await authApi.me();
        if (cancelled) return;

        // Tokens can outlive a demotion: the account may have been dropped to
        // LEADER since it last signed in.
        if (!isStaffRole(me.role)) {
          clearSession();
          return;
        }
        setUser(me);
        setStatus('authenticated');
      } catch {
        // The client's interceptor has already tried a refresh and cleared the
        // tokens if it failed. Anything reaching here means "no usable session".
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // ── React to a session dying mid-flight ────────────────────────────────────
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
      queryClient.clear();
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await authApi.login(email, password);

      // Defence in depth: the server already rejects non-staff at `/auth/login`.
      if (!isStaffRole(result.user.role)) {
        tokenStore.clear();
        throw new ApiError({
          code: ErrorCode.FORBIDDEN,
          message: NOT_STAFF_MESSAGE,
          status: 403,
        });
      }

      tokenStore.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      setUser(result.user);
      setStatus('authenticated');
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStore.getRefreshToken();

    // Revoke server-side first, but never let a failed call trap the user in a
    // session they asked to leave.
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async (): Promise<void> => {
    const me = await authApi.me();
    if (!isStaffRole(me.role)) {
      clearSession();
      return;
    }
    setUser(me);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      role: user?.role ?? null,
      login,
      logout,
      refreshUser,
    }),
    [status, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
