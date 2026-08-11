import React from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../features/auth/AuthContext.tsx';
import { ThemeProvider } from '../features/theme/ThemeContext.tsx';
import { AdminLayout } from '../components/layout/AdminLayout.tsx';
import { FullPageSpinner } from '../components/ui/spinner.tsx';
import { LoginPage } from '../features/auth/LoginPage.tsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.tsx';
import { SystemHealthPage } from '../features/health/SystemHealthPage.tsx';
import { StaffUsersPage } from '../features/users/StaffUsersPage.tsx';
import { CommunitiesPage } from '../features/communities/CommunitiesPage.tsx';
import { CommunityDetailPage } from '../features/communities/CommunityDetailPage.tsx';
import { AuditLogsPage } from '../features/audit/AuditLogsPage.tsx';
import { NotFoundPage } from '../features/errors/NotFoundPage.tsx';

/**
 * Gate for everything behind sign-in.
 *
 * The `loading` branch is what makes a hard refresh work: without it, the first
 * render happens before `/users/me` answers and every reload lands on /login.
 */
function ProtectedLayout(): React.JSX.Element {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Restoring your session…" />;

  if (status === 'unauthenticated') {
    // Remember the destination so sign-in can return the user to it.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

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
        element: <ProtectedLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/health', element: <SystemHealthPage /> },
          { path: '/users', element: <StaffUsersPage /> },
          { path: '/communities', element: <CommunitiesPage /> },
          { path: '/communities/:id', element: <CommunityDetailPage /> },
          { path: '/audit', element: <AuditLogsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
