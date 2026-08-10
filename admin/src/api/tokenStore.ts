/**
 * The single place tokens are read from or written to.
 *
 * Persistence is `localStorage` because the API returns the refresh token in the
 * response body rather than an `HttpOnly` cookie. That is a deliberate trade-off,
 * not an oversight: the same endpoints serve the Flutter app, which has no cookie
 * jar. It does mean any XSS in this console is a session compromise, so the
 * mitigation lives in the CSP and in never rendering untrusted HTML.
 *
 * Everything funnels through this module so that swapping to cookie-based auth
 * later is a change to one file.
 */

const ACCESS_TOKEN_KEY = 'samudaysetu.admin.accessToken';
const REFRESH_TOKEN_KEY = 'samudaysetu.admin.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Mirrored in memory so the request interceptor never touches `localStorage` on
 * the hot path, and so the app keeps working if storage is unavailable
 * (private-mode Safari, disabled cookies).
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the in-memory copy still carries this tab's session.
  }
}

// Hydrate once at module load, before any request can be issued.
accessToken = readStorage(ACCESS_TOKEN_KEY);
refreshToken = readStorage(REFRESH_TOKEN_KEY);

export const tokenStore = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => refreshToken,

  /** True when a session *might* be resumable; the server has the final say. */
  hasSession: (): boolean => accessToken !== null && refreshToken !== null,

  set(tokens: StoredTokens): void {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    writeStorage(ACCESS_TOKEN_KEY, tokens.accessToken);
    writeStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  clear(): void {
    accessToken = null;
    refreshToken = null;
    writeStorage(ACCESS_TOKEN_KEY, null);
    writeStorage(REFRESH_TOKEN_KEY, null);
  },
};
