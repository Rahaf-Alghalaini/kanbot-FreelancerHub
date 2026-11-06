import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sprintsApi } from '../api/sprints';
import { projectKeys } from './useProjects';
import { todoKeys } from './useTodos';

export const sprintKeys = {
  all: ['sprints'] as const,
  list: (projectId: string) => ['sprints', 'list', projectId] as const,
  board: (sprintId: string) => ['sprints', 'board', sprintId] as const,
};

/** SPR-1: GET /projects/:id/sprints (active first, then planned oldest first, then completed). */
export const useSprintsQuery = (projectId: string) =>
  useQuery({ queryKey: sprintKeys.list(projectId), queryFn: () => sprintsApi.list(projectId) });

/** SPR-4: GET /sprints/:id/todos, the sprint with its todos grouped by status column. */
export const useSprintBoardQuery = (sprintId?: string) =>
  useQuery({ queryKey: sprintKeys.board(sprintId ?? ''), queryFn: () => sprintsApi.board(sprintId!), enabled: !!sprintId });

/** After a sprint change: refresh sprints, todos (a deleted/started sprint changes them) and project counters. */
export function useRefreshSprints() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: sprintKeys.all }),
      qc.invalidateQueries({ queryKey: todoKeys.all }),
      qc.invalidateQueries({ queryKey: projectKeys.all }),
    ]);
}
