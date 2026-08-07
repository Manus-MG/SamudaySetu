import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import {
  OTP_LENGTH,
  OTP_LOCKOUT_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  env,
  isProduction,
} from '../../config/index.js';
import { AppError, ErrorCode } from '../../core/errors/index.js';
import { logger } from '../../core/logger/index.js';
import { otpChallengeRepository } from './auth.repository.js';
import type { OtpRequestResult } from './auth.types.js';

const HOUR_MS = 60 * 60 * 1000;

/** Hashed at rest: a database dump must not be replayable as a login. */
const hashCode = (code: string): string => createHash('sha256').update(code).digest('hex');

/** `randomInt` is CSPRNG-backed; `Math.random` would make codes predictable. */
function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  return randomInt(0, max).toString().padStart(OTP_LENGTH, '0');
}

/** Constant-time compare so response timing cannot be used to brute-force a code. */
function codesMatch(candidate: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashCode(candidate), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function lockedError(until: Date): AppError {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return new AppError(
    429,
    ErrorCode.OTP_LOCKED,
    `Too many incorrect attempts. Try again in ${minutes} minute(s).`,
    { messageHi: 'बहुत बार गलत कोड डाला गया। कृपया कुछ देर बाद प्रयास करें।' },
  );
}

/**
 * OTP issue and verification.
 *
 * Unthrottled OTP is a direct financial attack — every SMS costs money — so the
 * per-phone hourly quota is enforced here, in addition to the IP rate limiter on
 * the route. Both are required: one attacker with many phones defeats the per-phone
 * cap, and one phone across many IPs defeats the route limiter.
 */
export const otpService = {
  async request(phone: string, ip: string | null): Promise<OtpRequestResult> {
    const latest = await otpChallengeRepository.findLatest(phone);

    if (latest?.lockedUntil && latest.lockedUntil.getTime() > Date.now()) {
      throw lockedError(latest.lockedUntil);
    }

    const sentInLastHour = await otpChallengeRepository.countSince(
      phone,
      new Date(Date.now() - HOUR_MS),
    );
    if (sentInLastHour >= env.OTP_PER_PHONE_PER_HOUR) {
      throw AppError.rateLimited(
        `Only ${env.OTP_PER_PHONE_PER_HOUR} codes can be sent per hour. Please try again later.`,
        { messageHi: 'एक घंटे में इससे अधिक कोड नहीं भेजे जा सकते। कृपया बाद में प्रयास करें।' },
      );
    }

    const code = generateCode();
    await otpChallengeRepository.create({
      phone,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
      requestIp: ip,
    });

    // TODO: hand off to a DLT-registered Indian SMS provider behind an `SmsSender`
    // interface. Until then the code is surfaced locally so the flow is testable.
    //
    // The code is never logged in production: log sinks are widely readable and
    // long-lived, and a code sitting in them is a login sitting in them.
    if (isProduction) {
      logger.warn({ phone }, 'OTP generated but no SMS provider is configured');
    } else {
      logger.info({ phone, code }, 'OTP generated (development only — not sent)');
    }

    return {
      expiresInSeconds: env.OTP_TTL_SECONDS,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      ...(isProduction ? {} : { devCode: code }),
    };
  },

  /**
   * Verifies and consumes the newest code for a phone. Throws on every failure
   * path; returning normally means the phone is proven.
   */
  async verify(phone: string, code: string): Promise<void> {
    const challenge = await otpChallengeRepository.findLatest(phone);

    if (!challenge) {
      throw new AppError(400, ErrorCode.OTP_INVALID, 'Request a new code and try again', {
        messageHi: 'कृपया नया कोड मंगाएँ।',
      });
    }

    if (challenge.lockedUntil && challenge.lockedUntil.getTime() > Date.now()) {
      throw lockedError(challenge.lockedUntil);
    }

    if (challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) {
      throw new AppError(400, ErrorCode.OTP_EXPIRED, 'This code has expired. Request a new one.', {
        messageHi: 'यह कोड समाप्त हो गया है। कृपया नया कोड मंगाएँ।',
      });
    }

    if (!codesMatch(code, challenge.codeHash)) {
      const attempts = challenge.attempts + 1;
      const lockedUntil =
        attempts >= env.OTP_MAX_ATTEMPTS
          ? new Date(Date.now() + OTP_LOCKOUT_MINUTES * 60_000)
          : null;

      await otpChallengeRepository.incrementAttempts(challenge._id, lockedUntil);
      if (lockedUntil) throw lockedError(lockedUntil);

      throw new AppError(400, ErrorCode.OTP_INVALID, 'The code you entered is incorrect', {
        messageHi: 'दर्ज किया गया कोड गलत है।',
        details: { attemptsRemaining: env.OTP_MAX_ATTEMPTS - attempts },
      });
    }

    // Consume every outstanding code for the phone, not just this one, so a
    // previously issued code cannot be used a second time.
    await otpChallengeRepository.markConsumed(challenge._id);
    await otpChallengeRepository.consumeAllForPhone(phone);
  },
};
