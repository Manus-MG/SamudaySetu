import { z } from 'zod';
import {
  emailSchema,
  objectIdSchema,
  otpCodeSchema,
  phoneSchema,
} from '../../shared/schemas.js';

/**
 * Client-supplied device metadata for the "your devices" screen. Untrusted and
 * cosmetic — never used for an authorisation decision.
 */
const deviceSchema = z
  .object({
    deviceId: z.string().trim().min(8).max(128).optional(),
    deviceName: z.string().trim().min(1).max(120).optional(),
    platform: z.enum(['android', 'ios', 'web']).optional(),
  })
  .optional();

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: otpCodeSchema,
  device: deviceSchema,
});

export const passwordLoginSchema = z.object({
  email: emailSchema,
  // No length rule on login: the constraint belongs at registration, and enforcing
  // it here would leak which stored passwords are short.
  password: z.string().min(1, 'Password is required'),
  device: deviceSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const sessionIdParamSchema = z.object({ id: objectIdSchema });

export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type PasswordLoginBody = z.infer<typeof passwordLoginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type LogoutBody = z.infer<typeof logoutSchema>;
