import { api } from '../../api/client.ts';
import { getDeviceInfo } from '../../api/device.ts';
import type { AuthResult, SessionDto, UserDto } from '../../api/types.ts';

/** Thin, typed wrappers over `/api/v1/auth` and the self-service user routes. */
export const authApi = {
  /** Staff sign-in. The server refuses non-staff roles with INVALID_CREDENTIALS. */
  login: (email: string, password: string): Promise<AuthResult> =>
    api.post<AuthResult>('/auth/login', { email, password, device: getDeviceInfo() }),

  /** Resolves the signed-in user from the access token. Used to restore a session. */
  me: (): Promise<UserDto> => api.get<UserDto>('/users/me'),

  logout: (refreshToken: string): Promise<{ message: string }> =>
    api.post<{ message: string }>('/auth/logout', { refreshToken }),

  logoutEverywhere: (): Promise<{ revokedSessions: number }> =>
    api.post<{ revokedSessions: number }>('/auth/logout-all'),

  listSessions: (): Promise<{ sessions: SessionDto[] }> =>
    api.get<{ sessions: SessionDto[] }>('/auth/sessions'),

  revokeSession: (sessionId: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/auth/sessions/${sessionId}`),
};
