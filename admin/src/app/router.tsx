import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthContext.tsx';
import { ThemeProvider } from '../features/theme/ThemeContext.tsx';
import { AdminLayout } from '../components/layout/AdminLayout.tsx';
import { LoginPage } from '../features/auth/LoginPage.tsx';
import { SuperAdminDashboardPage } from '../features/dashboard/SuperAdminDashboardPage.tsx';
import { SystemHealthPage } from '../features/health/SystemHealthPage.tsx';
import { TenantsPage } from '../features/tenants/TenantsPage.tsx';
import { StaffUsersPage } from '../features/users/StaffUsersPage.tsx';
import { AuditLogsPage } from '../features/audit/AuditLogsPage.tsx';

/** Protected layout wrapper requiring authenticated staff user */
function ProtectedAdminLayout(): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

/** Root App context wrapper with ThemeProvider */
function RootLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <ProtectedAdminLayout />,
        children: [
          { path: '/', element: <SuperAdminDashboardPage /> },
          { path: '/health', element: <SystemHealthPage /> },
          { path: '/tenants', element: <TenantsPage /> },
          { path: '/users', element: <StaffUsersPage /> },
          { path: '/audit', element: <AuditLogsPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
