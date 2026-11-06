import { request } from './client';
import type {
  BulkCreateTodosRequest, BulkCreateTodosResponse, CreateTodoRequest, MoveTodoRequest,
  Todo, TodoListQuery, TodoListResponse, UpdateTodoRequest,
} from '../types/api';

export const todosApi = {
  list: (projectId: string, query?: TodoListQuery) =>
    request<TodoListResponse>(`/projects/${projectId}/todos`, { query: { ...query } }),
  get: (id: string) => request<{ todo: Todo }>(`/todos/${id}`),
  create: (projectId: string, body: CreateTodoRequest) => request<{ todo: Todo }>(`/projects/${projectId}/todos`, { method: 'POST', body }),
  bulkCreate: (projectId: string, body: BulkCreateTodosRequest) => request<BulkCreateTodosResponse>(`/projects/${projectId}/todos/bulk`, { method: 'POST', body }),
  update: (id: string, body: UpdateTodoRequest) => request<{ todo: Todo }>(`/todos/${id}`, { method: 'PATCH', body }),
  move: (id: string, body: MoveTodoRequest) => request<{ todo: Todo }>(`/todos/${id}/move`, { method: 'POST', body }),
  remove: (id: string) => request<void>(`/todos/${id}`, { method: 'DELETE' }),
};
