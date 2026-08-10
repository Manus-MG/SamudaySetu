import { api } from '../../api/client.ts';
import type {
  CommunityDto,
  CreateCommunityPayload,
  JoinKitDto,
  ListCommunitiesParams,
  ListMembersParams,
  ModerationAction,
  Paginated,
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

  /** Invalidates the old code immediately. Returns the new kit. */
  rotateJoinCode: (id: string): Promise<JoinKitDto> =>
    api.post<JoinKitDto>(`/communities/${id}/join-code/rotate`),

  members: (id: string, params: ListMembersParams): Promise<Paginated<UserDto>> =>
    api.get<Paginated<UserDto>>(`/communities/${id}/members`, { ...params }),

  reconcileMemberCount: (id: string): Promise<CommunityDto> =>
    api.post<CommunityDto>(`/communities/${id}/members/reconcile`),
};
