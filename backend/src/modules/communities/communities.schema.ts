import { z } from 'zod';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from '../../config/index.js';
import {
  emailSchema,
  objectIdSchema,
  paginationSchema,
  phoneSchema,
} from '../../shared/schemas.js';
import { COMMUNITY_STATUSES, COMMUNITY_TYPES } from './communities.types.js';
import { normaliseJoinCode } from './joinCode.js';

export const communityIdParamSchema = z.object({ id: objectIdSchema });

/**
 * Accepts a code in any shape a human might send it — `k7m2-qx9b`, `K7M2 QX9B`,
 * or with stray punctuation — and normalises before validating, so a correct code
 * is never rejected over formatting.
 */
export const joinCodeSchema = z
  .string()
  .trim()
  .min(1, 'Enter a join code')
  .transform(normaliseJoinCode)
  .pipe(
    z
      .string()
      .length(JOIN_CODE_LENGTH, `A join code is ${String(JOIN_CODE_LENGTH)} characters`)
      .regex(
        new RegExp(`^[${JOIN_CODE_ALPHABET}]+$`),
        'That code contains characters we never use — check for a 0/O or 1/I mix-up',
      ),
  );

export const joinCodeParamSchema = z.object({ code: joinCodeSchema });

/** Names must accept Devanagari; a samaj will not romanise itself for our regex. */
const communityNameSchema = z
  .string()
  .trim()
  .min(3, 'Community name must be at least 3 characters')
  .max(120, 'Community name must be at most 120 characters');

const locationSchema = z
  .object({
    state: z.string().trim().max(60).optional(),
    district: z.string().trim().max(60).optional(),
    city: z.string().trim().max(60).optional(),
    pincode: z
      .string()
      .trim()
      .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code')
      .optional(),
  })
  .strict();

export const createCommunitySchema = z
  .object({
    name: communityNameSchema,
    description: z.string().trim().max(1000).optional(),
    type: z.enum(COMMUNITY_TYPES),
    /**
     * Ignored when the requester is a leader — they may only ever create a
     * community for themselves, which the service enforces rather than trusting
     * the payload.
     */
    leaderId: objectIdSchema.optional(),
    location: locationSchema.optional(),
    contactEmail: emailSchema.optional(),
    contactPhone: phoneSchema.optional(),
  })
  .strict();

export const updateCommunitySchema = z
  .object({
    name: communityNameSchema.optional(),
    // Explicitly nullable: clearing a description is a real edit, and `undefined`
    // (absent) has to keep meaning "leave it alone".
    description: z.string().trim().max(1000).nullable().optional(),
    type: z.enum(COMMUNITY_TYPES).optional(),
    location: locationSchema.optional(),
    contactEmail: emailSchema.nullable().optional(),
    contactPhone: phoneSchema.nullable().optional(),
    isJoinable: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  });

export const moderateCommunitySchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE']),
    /** Required for `REJECT`; the service enforces that, so the message is specific. */
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export const assignLeaderSchema = z.object({ leaderId: objectIdSchema }).strict();

export const joinCommunitySchema = z.object({ code: joinCodeSchema }).strict();

export const listCommunitiesSchema = paginationSchema.extend({
  status: z.enum(COMMUNITY_STATUSES).optional(),
  type: z.enum(COMMUNITY_TYPES).optional(),
  leaderId: objectIdSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const listMembersSchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(80).optional(),
});

export type CreateCommunityBody = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityBody = z.infer<typeof updateCommunitySchema>;
export type ModerateCommunityBody = z.infer<typeof moderateCommunitySchema>;
export type AssignLeaderBody = z.infer<typeof assignLeaderSchema>;
export type JoinCommunityBody = z.infer<typeof joinCommunitySchema>;
export type ListCommunitiesQuery = z.infer<typeof listCommunitiesSchema>;
export type ListMembersQuery = z.infer<typeof listMembersSchema>;
