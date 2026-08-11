import { z } from 'zod';
import { ROLES } from '../../core/security/index.js';
import {
  emailSchema,
  fullNameSchema,
  genderSchema,
  languageSchema,
  objectIdSchema,
  paginationSchema,
  passwordSchema,
  phoneSchema,
} from '../../shared/schemas.js';
import { USER_STATUSES } from './users.types.js';

export const userIdParamSchema = z.object({ id: objectIdSchema });

/** Every field optional, but at least one required — an empty PATCH is a mistake. */
export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    gender: genderSchema.optional(),
    preferredLanguage: languageSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listUsersSchema = paginationSchema.extend({
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  search: z.string().trim().min(1).max(80).optional(),
});

/**
 * Staff accounts only. Members are created implicitly by OTP verification.
 *
 * A phone number is mandatory for `LEADER` and optional for everyone else, and
 * the asymmetry is not arbitrary: leaders work in the **mobile app**, which has
 * no password login at all — they sign in by phone and OTP like any member. A
 * leader created with only an email would have a working account and no way to
 * reach it. Admins and super admins sign in to the web console with the email and
 * password below, so their phone is genuinely optional.
 */
export const createStaffUserSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
    role: z.enum(ROLES),
    phone: phoneSchema.optional(),
    preferredLanguage: languageSchema.optional(),
  })
  .refine((value) => value.role !== 'LEADER' || value.phone !== undefined, {
    message: 'A leader signs in to the mobile app by phone, so a phone number is required',
    path: ['phone'],
  });

export const assignRoleSchema = z.object({ role: z.enum(ROLES) });

/** `DELETED` is reachable only through the delete route, never through a status set. */
export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type CreateStaffUserBody = z.infer<typeof createStaffUserSchema>;
export type AssignRoleBody = z.infer<typeof assignRoleSchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
