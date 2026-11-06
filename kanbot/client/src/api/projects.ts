import { request } from './client';
import type { CreateProjectRequest, Project, ProjectWithStats, UpdateProjectRequest } from '../types/api';

export const projectsApi = {
  list: () => request<{ projects: ProjectWithStats[] }>('/projects'),
  get: (id: string) => request<{ project: ProjectWithStats }>(`/projects/${id}`),
  create: (body: CreateProjectRequest) => request<{ project: Project }>('/projects', { method: 'POST', body }),
  update: (id: string, body: UpdateProjectRequest) => request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
};
