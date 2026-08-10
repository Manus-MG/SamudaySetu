import { api } from '../../api/client.ts';
import type {
  CreateStaffUserPayload,
  ListUsersParams,
  Paginated,
  Role,
  SettableUserStatus,
  UserDto,
} from '../../api/types.ts';

export const userKeys = {
  all: ['users'] as const,
  /**
   * Params are part of the key so every filter combination caches separately and
   * a single `invalidateQueries({ queryKey: userKeys.all })` refreshes them all.
   */
  list: (params: ListUsersParams) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

export const usersApi = {
  list: (params: ListUsersParams): Promise<Paginated<UserDto>> =>
    api.get<Paginated<UserDto>>('/users', { ...params }),

  getById: (id: string): Promise<UserDto> => api.get<UserDto>(`/users/${id}`),

  create: (payload: CreateStaffUserPayload): Promise<UserDto> =>
    api.post<UserDto>('/users', payload),

  assignRole: (id: string, role: Role): Promise<UserDto> =>
    api.patch<UserDto>(`/users/${id}/role`, { role }),

  setStatus: (id: string, status: SettableUserStatus): Promise<UserDto> =>
    api.patch<UserDto>(`/users/${id}/status`, { status }),

  /** Soft delete: the server erases PII and keeps a tombstone row. */
  remove: (id: string): Promise<UserDto> => api.delete<UserDto>(`/users/${id}`),
};
