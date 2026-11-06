import { request } from './client';
import type {
  CompleteSprintRequest, CreateSprintRequest, Sprint, SprintBoardResponse,
  SprintListResponse, StartSprintRequest, UpdateSprintRequest,
} from '../types/api';

export const sprintsApi = {
  list: (projectId: string) => request<SprintListResponse>(`/projects/${projectId}/sprints`),
  create: (projectId: string, body: CreateSprintRequest) => request<{ sprint: Sprint }>(`/projects/${projectId}/sprints`, { method: 'POST', body }),
  update: (id: string, body: UpdateSprintRequest) => request<{ sprint: Sprint }>(`/sprints/${id}`, { method: 'PATCH', body }),
  start: (id: string, body: StartSprintRequest = {}) => request<{ sprint: Sprint }>(`/sprints/${id}/start`, { method: 'POST', body }),
  complete: (id: string, body: CompleteSprintRequest) => request<{ sprint: Sprint }>(`/sprints/${id}/complete`, { method: 'POST', body }),
  board: (id: string) => request<SprintBoardResponse>(`/sprints/${id}/todos`),
  remove: (id: string) => request<void>(`/sprints/${id}`, { method: 'DELETE' }),
};
