import { randomUUID } from 'node:crypto';
import { AppError, ErrorCode } from '../../core/errors/index.js';
import { logger } from '../../core/logger/index.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../../core/security/index.js';
import { refreshTokenRepository } from './auth.repository.js';
import type { RefreshTokenDocument, RevokeReason } from './refreshToken.model.js';
import type { SessionContext, SessionDto, TokenPair } from './auth.types.js';

/** Access-token lifetime in seconds, mirrored to clients so they can pre-refresh. */
const ACCESS_TTL_SECONDS = 15 * 60;

function toSessionDto(doc: RefreshTokenDocument, currentDeviceId: string): SessionDto {
  return {
    id: doc._id.toString(),
    deviceId: doc.deviceId,
    deviceName: doc.deviceName,
    platform: doc.platform,
    ip: doc.ip,
    lastUsedAt: doc.lastUsedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
    isCurrent: doc.deviceId === currentDeviceId,
  };
}

async function persist(
  userId: string,
  familyId: string,
  deviceId: string,
  context: SessionContext,
): Promise<TokenPair> {
  const { token, tokenHash } = generateRefreshToken();

  await refreshTokenRepository.create({
    userId,
    tokenHash,
    familyId,
    deviceId,
    deviceName: context.device.deviceName ?? null,
    platform: context.device.platform ?? null,
    ip: context.ip,
    expiresAt: refreshTokenExpiry(),
  });

  return {
    accessToken: signAccessToken(userId, deviceId).token,
    refreshToken: token,
    expiresIn: ACCESS_TTL_SECONDS,
    tokenType: 'Bearer',
  };
}

/**
 * Owns the refresh-token lifecycle. Deliberately knows nothing about users or
 * OTPs, so other modules can revoke sessions without creating an import cycle.
 */
export const tokenService = {
  /** Starts a new token family. Called once per successful login. */
  issue(userId: string, context: SessionContext): Promise<TokenPair> {
    const deviceId = context.device.deviceId ?? randomUUID();
    return persist(userId, randomUUID(), deviceId, context);
  },

  /**
   * Single-use rotation with reuse detection.
   *
   * Presenting an already-rotated or revoked token means the token was stolen —
   * either by the attacker or by the legitimate client replaying it. We cannot tell
   * which, so we fail safe: revoke the entire family and force a fresh login.
   */
  async rotate(presentedToken: string, context: SessionContext): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(presentedToken);
    const existing = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing) {
      throw AppError.unauthenticated('Invalid refresh token', {
        messageHi: 'सत्र अमान्य है। कृपया पुनः लॉगिन करें।',
      });
    }

    if (existing.revokedAt) {
      const { modifiedCount } = await refreshTokenRepository.revokeFamily(
        existing.familyId,
        'REUSE_DETECTED',
      );
      logger.warn(
        { userId: existing.userId.toString(), familyId: existing.familyId, modifiedCount },
        'Refresh token reuse detected — revoked the entire token family',
      );
      throw new AppError(401, ErrorCode.SESSION_REVOKED, 'Session revoked. Please sign in again.', {
        messageHi: 'सुरक्षा कारणों से सत्र समाप्त कर दिया गया। कृपया पुनः लॉगिन करें।',
      });
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, ErrorCode.TOKEN_EXPIRED, 'Refresh token has expired', {
        messageHi: 'सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।',
      });
    }

    // Retire the presented token before minting its replacement, so a crash in
    // between leaves the user logged out rather than holding two live tokens.
    await refreshTokenRepository.revokeById(existing._id, 'ROTATED');
    await refreshTokenRepository.markUsed(existing._id);

    return persist(existing.userId.toString(), existing.familyId, existing.deviceId, context);
  },

  /** Logout. Unknown or already-revoked tokens succeed silently — logout is idempotent. */
  async revoke(presentedToken: string): Promise<void> {
    const existing = await refreshTokenRepository.findByTokenHash(hashRefreshToken(presentedToken));
    if (existing && !existing.revokedAt) {
      await refreshTokenRepository.revokeById(existing._id, 'LOGOUT');
    }
  },

  /** "Sign out everywhere", and the hook for suspension and deletion. */
  async revokeAllForUser(userId: string, reason: RevokeReason): Promise<number> {
    const { modifiedCount } = await refreshTokenRepository.revokeAllForUser(userId, reason);
    return modifiedCount;
  },

  async listSessions(userId: string, currentDeviceId: string): Promise<SessionDto[]> {
    const sessions = await refreshTokenRepository.listActive(userId);
    return sessions.map((session) => toSessionDto(session, currentDeviceId));
  },

  /** Revokes one session by id, scoped to its owner so ids cannot be guessed across users. */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await refreshTokenRepository.findById(sessionId, userId);
    if (!session) throw AppError.notFound('Session not found');
    if (session.revokedAt) return;
    await refreshTokenRepository.revokeById(session._id, 'LOGOUT');
  },
};
