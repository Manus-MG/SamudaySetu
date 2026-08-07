import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../features/members/DashboardPage.tsx';
import { LoginPage } from '../features/auth/LoginPage.tsx';

/**
 * OWNER/ADMIN only. These accounts control lakhs of records, so the web dashboard
 * uses email + password + mandatory TOTP — not phone OTP (ARCHITECTURE.md §3.1).
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <DashboardPage /> },
]);
