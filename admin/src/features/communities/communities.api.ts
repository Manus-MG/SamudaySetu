import { api } from '../../api/client.ts';
import type {
  CommunityDto,
  CreateCommunityPayload,
  InviteDto,
  JoinCodeAvailabilityDto,
  JoinKitDto,
  ListCommunitiesParams,
  ListInvitesParams,
  ListMembersParams,
  ModerationAction,
  Paginated,
  SentInviteDto,
  UpdateCommunityPayload,
  UserDto,
} from '../../api/types.ts';

export const communityKeys = {
  all: ['communities'] as const,
  /**
   * Params are part of the key so every filter combination caches separately and
   * one `invalidateQueries({ queryKey: communityKeys.all })` refreshes them all.
   */
  list: (params: ListCommunitiesParams) => ['communities', 'list', params] as const,
  detail: (id: string) => ['communities', 'detail', id] as const,
  joinKit: (id: string) => ['communities', 'joinKit', id] as const,
  codeCheck: (id: string, code: string) => ['communities', 'codeCheck', id, code] as const,
  invites: (id: string, params: ListInvitesParams) =>
    ['communities', 'invites', id, params] as const,
  members: (id: string, params: ListMembersParams) =>
    ['communities', 'members', id, params] as const,
};

export const communitiesApi = {
  list: (params: ListCommunitiesParams): Promise<Paginated<CommunityDto>> =>
    api.get<Paginated<CommunityDto>>('/communities', { ...params }),

  getById: (id: string): Promise<CommunityDto> => api.get<CommunityDto>(`/communities/${id}`),

  create: (payload: CreateCommunityPayload): Promise<CommunityDto> =>
    api.post<CommunityDto>('/communities', payload),

  update: (id: string, payload: UpdateCommunityPayload): Promise<CommunityDto> =>
    api.patch<CommunityDto>(`/communities/${id}`, payload),

  /** Approve, reject, suspend or reactivate. `reason` is required for `REJECT`. */
  moderate: (id: string, action: ModerationAction, reason?: string): Promise<CommunityDto> =>
    api.patch<CommunityDto>(`/communities/${id}/moderation`, {
      action,
      ...(reason ? { reason } : {}),
    }),

  assignLeader: (id: string, leaderId: string): Promise<CommunityDto> =>
    api.patch<CommunityDto>(`/communities/${id}/leader`, { leaderId }),

  removeLeader: (id: string): Promise<CommunityDto> =>
    api.delete<CommunityDto>(`/communities/${id}/leader`),

  /** Soft delete: members are released and the join code returns to the pool. */
  archive: (id: string): Promise<CommunityDto> => api.delete<CommunityDto>(`/communities/${id}`),

  joinKit: (id: string): Promise<JoinKitDto> => api.get<JoinKitDto>(`/communities/${id}/join-kit`),

  /** Issues a fresh two-word code. Invalidates the old one immediately. */
  rotateJoinCode: (id: string): Promise<JoinKitDto> =>
    api.post<JoinKitDto>(`/communities/${id}/join-code/rotate`),

  /** Live availability check. A GET with no side effects — safe to call per keystroke. */
  checkJoinCode: (id: string, code: string): Promise<JoinCodeAvailabilityDto> =>
    api.get<JoinCodeAvailabilityDto>(`/communities/${id}/join-code/check`, { code }),

  setJoinCode: (id: string, code: string): Promise<JoinKitDto> =>
    api.put<JoinKitDto>(`/communities/${id}/join-code`, { code }),

  // ── Invites ────────────────────────────────────────────────────────────────
  listInvites: (id: string, params: ListInvitesParams): Promise<Paginated<InviteDto>> =>
    api.get<Paginated<InviteDto>>(`/communities/${id}/invites`, { ...params }),

  sendInvite: (id: string, phone: string): Promise<SentInviteDto> =>
    api.post<SentInviteDto>(`/communities/${id}/invites`, { phone }),

  revokeInvite: (id: string, inviteId: string): Promise<InviteDto> =>
    api.delete<InviteDto>(`/communities/${id}/invites/${inviteId}`),

  members: (id: string, params: ListMembersParams): Promise<Paginated<UserDto>> =>
    api.get<Paginated<UserDto>>(`/communities/${id}/members`, { ...params }),

  reconcileMemberCount: (id: string): Promise<CommunityDto> =>
    api.post<CommunityDto>(`/communities/${id}/members/reconcile`),
};
