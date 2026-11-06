import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { todosApi } from '../api/todos';
import { projectKeys } from './useProjects';
import type { Todo, TodoListQuery } from '../types/api';

export const todoKeys = {
  all: ['todos'] as const,
  list: (projectId: string, q: TodoListQuery) => ['todos', 'list', projectId, q] as const,
  one: (id: string) => ['todos', 'one', id] as const,
};

/** BL-1 / BL-6: GET /projects/:id/todos with filters. Keeps the old rows on screen while a new filter loads. */
export const useTodosQuery = (projectId: string, q: TodoListQuery) =>
  useQuery({ queryKey: todoKeys.list(projectId, q), queryFn: () => todosApi.list(projectId, q), placeholderData: keepPreviousData });

/** BL-3: GET /todos/:id. `initial` shows instantly while the fresh copy loads. */
export const useTodoQuery = (id: string, initial?: Todo) =>
  useQuery({ queryKey: todoKeys.one(id), queryFn: () => todosApi.get(id), placeholderData: initial ? { todo: initial } : undefined });

/** After any todo change: refresh todo lists/details, project counters and sprint boards. */
export function useRefreshTodos() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: todoKeys.all }),
      qc.invalidateQueries({ queryKey: projectKeys.all }),
      qc.invalidateQueries({ queryKey: ['sprints'] }), // boards and sprint stats (same value as sprintKeys.all)
    ]);
}
