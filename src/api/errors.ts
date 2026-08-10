import axios from 'axios';

/**
 * Stable, machine-readable error codes.
 * Mirrors `backend/src/core/errors/errorCodes.ts` — branch on these, never on
 * the human-readable message.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_REVOKED: 'SESSION_REVOKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_LOCKED: 'OTP_LOCKED',

  FORBIDDEN: 'FORBIDDEN',
  ROLE_ESCALATION_DENIED: 'ROLE_ESCALATION_DENIED',

  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  AADHAAR_NOT_ALLOWED: 'AADHAAR_NOT_ALLOWED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** The failure half of the API envelope. */
export interface ApiFailureBody {
  success: false;
  error: {
    code: ErrorCodeValue;
    message: string;
    messageHi?: string;
    details?: unknown;
  };
}

/**
 * A server-side failure, normalised. Thrown by the HTTP client so that callers
 * handle exactly one error type instead of unwrapping `AxiosError` everywhere.
 */
export class ApiError extends Error {
  readonly code: ErrorCodeValue;
  readonly status: number;
  readonly messageHi: string | undefined;
  readonly details: unknown;

  constructor(params: {
    code: ErrorCodeValue;
    message: string;
    status: number;
    messageHi?: string | undefined;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.messageHi = params.messageHi;
    this.details = params.details;
  }

  /** True when the browser never got a response — server down, DNS, offline. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

const NETWORK_MESSAGE =
  'Cannot reach the API. Check that the backend is running on http://127.0.0.1:4000.';

function isApiFailureBody(value: unknown): value is ApiFailureBody {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ApiFailureBody>;
  return (
    candidate.success === false &&
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof candidate.error.message === 'string'
  );
}

/**
 * Converts anything thrown by axios into an `ApiError`. Never throws itself —
 * an error handler that can fail is an error handler that hides the real error.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body: unknown = error.response?.data;

    if (isApiFailureBody(body)) {
      return new ApiError({
        code: body.error.code,
        message: body.error.message,
        status,
        messageHi: body.error.messageHi,
        details: body.error.details,
      });
    }

    return new ApiError({
      code: status === 0 ? ErrorCode.SERVICE_UNAVAILABLE : ErrorCode.INTERNAL,
      message: status === 0 ? NETWORK_MESSAGE : (error.message || 'Request failed'),
      status,
    });
  }

  return new ApiError({
    code: ErrorCode.INTERNAL,
    message: error instanceof Error ? error.message : 'Something went wrong',
    status: 0,
  });
}

/** Convenience for rendering: safe on any thrown value. */
export const errorMessage = (error: unknown): string => toApiError(error).message;
