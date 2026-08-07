import { beforeAll, describe, expect, it } from 'vitest';
import type * as TokensModule from '../../src/core/security/tokens.js';

// The env module validates at import time, so the required variables must exist
// before anything under `src/` is loaded.
process.env['MONGODB_URI'] ??= 'mongodb://127.0.0.1:27017';
process.env['JWT_ACCESS_SECRET'] ??= 'test-secret-that-is-at-least-32-characters-long';

let tokens: typeof TokensModule;

beforeAll(async () => {
  tokens = await import('../../src/core/security/tokens.js');
});

describe('access tokens', () => {
  it('round-trips the user and device through sign/verify', () => {
    const { token } = tokens.signAccessToken('507f1f77bcf86cd799439011', 'device-1');
    const claims = tokens.verifyAccessToken(token);

    expect(claims.sub).toBe('507f1f77bcf86cd799439011');
    expect(claims.did).toBe('device-1');
    expect(claims.jti).toHaveLength(36);
  });

  it('issues a distinct jti per token, so one can be denylisted alone', () => {
    const a = tokens.signAccessToken('507f1f77bcf86cd799439011', 'device-1');
    const b = tokens.signAccessToken('507f1f77bcf86cd799439011', 'device-1');
    expect(a.jti).not.toBe(b.jti);
  });

  it('never carries the role, so revocation cannot be delayed by token lifetime', () => {
    const { token } = tokens.signAccessToken('507f1f77bcf86cd799439011', 'device-1');
    const [, payload] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payload as string, 'base64url').toString()) as Record<
      string,
      unknown
    >;
    expect(decoded).not.toHaveProperty('role');
  });

  it('rejects a tampered token', () => {
    const { token } = tokens.signAccessToken('507f1f77bcf86cd799439011', 'device-1');
    expect(() => tokens.verifyAccessToken(`${token}x`)).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    expect(() =>
      tokens.verifyAccessToken(
        // header.payload.signature from an unrelated key
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhIn0.wrong-signature',
      ),
    ).toThrow();
  });
});

describe('refresh tokens', () => {
  it('stores only a hash, never the token itself', () => {
    const { token, tokenHash } = tokens.generateRefreshToken();
    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes deterministically, so lookup by hash works', () => {
    const { token, tokenHash } = tokens.generateRefreshToken();
    expect(tokens.hashRefreshToken(token)).toBe(tokenHash);
  });

  it('never repeats a token', () => {
    const generated = new Set(
      Array.from({ length: 200 }, () => tokens.generateRefreshToken().token),
    );
    expect(generated.size).toBe(200);
  });

  it('expires in the future', () => {
    expect(tokens.refreshTokenExpiry().getTime()).toBeGreaterThan(Date.now());
  });
});
