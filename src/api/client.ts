import axios, { type AxiosInstance } from 'axios';

const TENANT_HEADER = 'X-Tenant-Id';

/** Every response from the API uses this envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; messageHi?: string; details?: unknown };
}

let activeTenantId: string | null = null;
export const setActiveTenantId = (tenantId: string | null): void => {
  activeTenantId = tenantId;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1',
  timeout: 15_000,
  // Access + refresh tokens live in httpOnly cookies on web, never in localStorage.
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (activeTenantId) config.headers.set(TENANT_HEADER, activeTenantId);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError<ApiFailure>(error) && error.response?.status === 401) {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<ApiSuccess<T>>(url, { params });
  return data.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiSuccess<T>>(url, body);
  return data.data;
}
