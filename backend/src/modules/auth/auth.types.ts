import type { UserDto } from '../users/users.types.js';

/** Optional device metadata a client may send at login, for the sessions screen. */
export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
}

/** Everything needed to persist a session, gathered by the controller. */
export interface SessionContext {
  device: DeviceInfo;
  ip: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds, so clients can refresh proactively. */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResult extends TokenPair {
  user: UserDto;
  /** True when this OTP verification created the account. Drives onboarding. */
  isNewUser: boolean;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /** Populated outside production only, so the flow is testable without an SMS bill. */
  devCode?: string;
}

export interface SessionDto {
  id: string;
  deviceId: string;
  deviceName: string | null;
  platform: string | null;
  ip: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string;
  /** True for the session that made this request. */
  isCurrent: boolean;
}
