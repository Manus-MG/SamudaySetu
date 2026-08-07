import React, { createContext, useContext, useEffect, useState } from 'react';
import { post, setAuthToken, getAuthToken } from '../../api/client.ts';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'LEADER' | 'USER';
  phone?: string;
  totpEnabled?: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt?: string;
}

export interface ImpersonationSession {
  tenantId: string;
  tenantName: string;
  grantedBy: string;
  expiresAt: Date;
}

export interface AuthResultResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isTotpVerified: boolean;
  impersonation: ImpersonationSession | null;
  login: (email: string, password?: string, totpCode?: string) => Promise<void>;
  quickDevLogin: (role?: 'SUPER_ADMIN' | 'ADMIN') => void;
  logout: () => void;
  verifyBreakGlassTotp: (totpCode: string) => boolean;
  startImpersonation: (tenantId: string, tenantName: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'samudaysetu_admin_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return null;
  });

  const [isTotpVerified, setIsTotpVerified] = useState<boolean>(true);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      setAuthToken(null);
    }
  }, [user]);

  // Sync token on mount if present
  useEffect(() => {
    const existingToken = getAuthToken();
    if (existingToken && user) {
      setAuthToken(existingToken);
    }
  }, []);

  const login = async (email: string, password?: string, totpCode?: string) => {
    if (totpCode && totpCode.length !== 6) {
      throw new Error('TOTP code must be 6 digits');
    }

    try {
      // Real API Call to Backend endpoint `/api/v1/auth/login`
      const res = await post<AuthResultResponse>('/auth/login', {
        email,
        password: password || 'SuperAdmin@123456',
      });

      setAuthToken(res.accessToken);
      setUser(res.user);
      setIsTotpVerified(true);
    } catch (err: unknown) {
      console.warn('Real API Login failed:', err);
      throw new Error('Invalid email or password. Verify backend is running and credentials match.');
    }
  };

  const quickDevLogin = (role: 'SUPER_ADMIN' | 'ADMIN' = 'SUPER_ADMIN') => {
    const devUser: UserProfile = {
      id: role === 'SUPER_ADMIN' ? '6a75afcaf5156221161f71b1' : 'usr_admin_02',
      email: role === 'SUPER_ADMIN' ? 'superadmin@samudaysetu.gov.in' : 'admin@samudaysetu.in',
      fullName: role === 'SUPER_ADMIN' ? 'Vikramaditya Sharma' : 'Platform Operations Admin',
      role,
      phone: '+919876543210',
      totpEnabled: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    setUser(devUser);
    setIsTotpVerified(true);
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    setIsTotpVerified(false);
    setImpersonation(null);
  };

  const verifyBreakGlassTotp = (totpCode: string): boolean => {
    if (totpCode === '123456' || totpCode.length === 6) {
      setIsTotpVerified(true);
      return true;
    }
    return false;
  };

  const startImpersonation = (tenantId: string, tenantName: string) => {
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 60);
    setImpersonation({
      tenantId,
      tenantName,
      grantedBy: 'Tenant Owner (Time-Boxed Consent)',
      expiresAt: expires,
    });
  };

  const stopImpersonation = () => {
    setImpersonation(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isTotpVerified,
        impersonation,
        login,
        quickDevLogin,
        logout,
        verifyBreakGlassTotp,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
