import { request } from './client';
import type {
  AiStatusResponse, ChatRequest, ChatResponse, GenerateTodosRequest, GenerateTodosResponse,
  PlanSprintRequest, PlanSprintResponse, SprintSummaryResponse,
} from '../types/api';

export const aiApi = {
  status: () => request<AiStatusResponse>('/ai/status'),
  generateTodos: (projectId: string, body: GenerateTodosRequest) => request<GenerateTodosResponse>(`/projects/${projectId}/ai/generate-todos`, { method: 'POST', body }),
  planSprint: (projectId: string, body: PlanSprintRequest) => request<PlanSprintResponse>(`/projects/${projectId}/ai/plan-sprint`, { method: 'POST', body }),
  summary: (sprintId: string) => request<SprintSummaryResponse>(`/sprints/${sprintId}/ai/summary`, { method: 'POST' }),
  chat: (projectId: string, body: ChatRequest) => request<ChatResponse>(`/projects/${projectId}/ai/chat`, { method: 'POST', body }),
};
