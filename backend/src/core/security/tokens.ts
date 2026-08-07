import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/index.js';
import { AppError, ErrorCode } from '../errors/index.js';

const ISSUER = 'samudaysetu';
const AUDIENCE = 'samudaysetu-clients';
const REFRESH_TOKEN_BYTES = 32;

/**
 * Access token claims.
 *
 * The role is deliberately absent. If it were baked in, removing a leader would
 * take effect only when their 15-minute token expired; instead the role is read
 * from the database on every request, so revocation is immediate.
 */
export interface AccessTokenClaims {
  /** User id. */
  sub: string;
  /** Device/session id, so a stolen token can be traced to one device. */
  did: string;
  /** Token id — lets a single access token be denylisted if that is ever needed. */
  jti: string;
}

export interface SignedAccessToken {
  token: string;
  jti: string;
}

export function signAccessToken(userId: string, deviceId: string): SignedAccessToken {
  const jti = randomUUID();
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: userId,
    jwtid: jti,
  };
  const token = jwt.sign({ did: deviceId }, env.JWT_ACCESS_SECRET, options);
  return { token, jti };
}

/** Throws `AppError` (401) on any invalid, expired or tampered token. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof payload === 'string' || !payload.sub || !payload.jti) {
      throw AppError.unauthenticated('Malformed access token');
    }

    return {
      sub: payload.sub,
      did: typeof payload['did'] === 'string' ? payload['did'] : '',
      jti: payload.jti,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, ErrorCode.TOKEN_EXPIRED, 'Access token has expired', {
        messageHi: 'सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।',
        cause: error,
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthenticated('Invalid access token', { cause: error });
    }
    throw error;
  }
}

/**
 * Refresh tokens are opaque random bytes, not JWTs: they must be revocable, and a
 * self-contained token cannot be revoked. Only the SHA-256 hash is persisted, so a
 * leaked database dump cannot be replayed as a login.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Absolute expiry for a newly issued refresh token. */
export function refreshTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
