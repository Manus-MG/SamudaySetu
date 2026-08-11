import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiError, ErrorCode, toApiError } from './errors.ts';
import { tokenStore } from './tokenStore.ts';
import type { TokenPair } from './types.ts';

/** The success half of the API envelope. Every 2xx response has this shape. */
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

const BASE_URL: string = import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;

/** Endpoints that must never trigger the refresh-and-retry path. */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'] as const;

/** 401/403 codes that mean "this access token is stale", not "you may not do this". */
const REFRESHABLE_CODES: readonly string[] = [
  ErrorCode.TOKEN_EXPIRED,
  ErrorCode.UNAUTHENTICATED,
];

/** Marker so a request is only ever retried once, however deep the failure. */
interface RetryableConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // The API is token-based, not cookie-based. Sending credentials would only widen
  // the CORS surface for no benefit.
  withCredentials: false,
});

/**
 * Bare instance for the refresh call. It deliberately shares no interceptors with
 * `apiClient`: a refresh that 401s must fail immediately rather than recursing
 * into another refresh.
 */
const refreshClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

// ── Session-expiry notification ──────────────────────────────────────────────

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

/**
 * Registered by `AuthContext`. Kept as a callback rather than a hard
 * `window.location` redirect so the auth layer, not the transport layer, decides
 * what "your session ended" looks like.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  sessionExpiredHandler = handler;
}

function endSession(): void {
  tokenStore.clear();
  sessionExpiredHandler?.();
}

// ── Single-flight refresh ────────────────────────────────────────────────────

/**
 * In-flight refresh, shared by every request that 401s while it runs.
 *
 * Without this, a dashboard that fires five parallel queries would fire five
 * refreshes; four of them would present an already-rotated token and the server
 * would correctly treat that as replay and revoke the whole session.
 */
let refreshInFlight: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await refreshClient.post<ApiSuccess<TokenPair>>('/auth/refresh', {
    refreshToken,
  });

  tokenStore.set({
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  });
  return data.data.accessToken;
}

function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ── Interceptors ─────────────────────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw toApiError(error);

    const config = error.config as RetryableConfig | undefined;
    const apiError = toApiError(error);

    const isRefreshable =
      apiError.status === 401 &&
      REFRESHABLE_CODES.includes(apiError.code) &&
      config !== undefined &&
      config._isRetry !== true &&
      !AUTH_ENDPOINTS.some((path) => config.url?.startsWith(path)) &&
      tokenStore.getRefreshToken() !== null;

    if (!isRefreshable) {
      // A revoked session or a suspended account is terminal — no refresh will fix
      // it, so tear the session down rather than leaving a half-dead UI.
      if (
        apiError.status === 401 ||
        apiError.code === ErrorCode.SESSION_REVOKED ||
        apiError.code === ErrorCode.ACCOUNT_SUSPENDED
      ) {
        endSession();
      }
      throw apiError;
    }

    try {
      const accessToken = await refreshAccessToken();
      config._isRetry = true;
      config.headers.set('Authorization', `Bearer ${accessToken}`);
      return await apiClient.request(config);
    } catch {
      endSession();
      throw new ApiError({
        code: ErrorCode.UNAUTHENTICATED,
        message: 'Your session has expired. Please sign in again.',
        status: 401,
      });
    }
  },
);

// ── Typed verbs ──────────────────────────────────────────────────────────────
//
// Every helper unwraps the envelope and throws `ApiError`, so call sites deal in
// domain types and one error class — never in `AxiosResponse`.

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<ApiSuccess<T>>(config);
    return response.data.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
    request<T>({ method: 'GET', url, params }),

  post: <T>(url: string, data?: unknown): Promise<T> =>
    request<T>({ method: 'POST', url, data }),

  patch: <T>(url: string, data?: unknown): Promise<T> =>
    request<T>({ method: 'PATCH', url, data }),

  /** For replacing a whole value, e.g. a community's join code. */
  put: <T>(url: string, data?: unknown): Promise<T> =>
    request<T>({ method: 'PUT', url, data }),

  delete: <T>(url: string): Promise<T> => request<T>({ method: 'DELETE', url }),
};
