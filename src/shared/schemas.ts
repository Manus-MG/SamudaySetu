import { z } from 'zod';

/** Indian mobile in E.164. Rural users type 10 digits; normalise before validating. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .transform((v) => (/^[6-9]\d{9}$/.test(v) ? `+91${v}` : v))
  .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'));

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

/** Names must accept Devanagari. Never force users to type their name in English. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[ऀ-ॿ a-zA-Z.'-]+$/u, 'Name contains unsupported characters');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

/**
 * Staff passwords only — ordinary members never have one. Length does more for
 * strength than composition rules, which mostly produce `Password1!`.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters');

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const languageSchema = z.enum(['hi', 'en', 'bho', 'mai', 'ur']).default('hi');

export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
