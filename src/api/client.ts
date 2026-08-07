import axios, { type AxiosInstance } from 'axios';

const TENANT_HEADER = 'X-Tenant-Id';
const AUTH_TOKEN_KEY = 'samudaysetu_access_token';

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
let authToken: string | null = localStorage.getItem(AUTH_TOKEN_KEY);

export const setActiveTenantId = (tenantId: string | null): void => {
  activeTenantId = tenantId;
};

export const setAuthToken = (token: string | null): void => {
  authToken = token;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const getAuthToken = (): string | null => authToken;

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1',
  timeout: 15_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (activeTenantId) {
    config.headers.set(TENANT_HEADER, activeTenantId);
  }
  if (authToken) {
    config.headers.set('Authorization', `Bearer ${authToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Note: Do not hard redirect on 401 if on /login page
    if (
      axios.isAxiosError<ApiFailure>(error) &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      // Optional auto-redirect if session unauthenticated
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

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiSuccess<T>>(url, body);
  return data.data;
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<ApiSuccess<T>>(url);
  return data.data;
}
