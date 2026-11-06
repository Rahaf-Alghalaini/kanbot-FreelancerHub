import { useMutation, useQueryClient } from '@tanstack/react-query';
import { todosApi } from '../api/todos';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import { sprintKeys, useRefreshSprints } from './useSprints';
import { TODO_STATUSES, type SprintBoardResponse, type SprintStats, type Todo, type TodoStatus } from '../types/api';

const points = (list: Todo[]) => list.reduce((n, t) => n + (t.storyPoints ?? 0), 0);

/** Recompute the sprint's live numbers from the columns, so the progress bar moves instantly. */
export function withStats(board: SprintBoardResponse): SprintBoardResponse {
  const all = TODO_STATUSES.flatMap((s) => board.columns[s]);
  const stats: SprintStats = {
    totalTodos: all.length,
    doneTodos: board.columns.done.length,
    totalPoints: points(all),
    donePoints: points(board.columns.done),
    byStatus: Object.fromEntries(TODO_STATUSES.map((s) => [s, board.columns[s].length])) as Record<TodoStatus, number>,
  };
  return { ...board, sprint: { ...board.sprint, stats } };
}

export type BoardMoveVars = { todo: Todo; status: TodoStatus; position: number };

/** SPR-5: POST /todos/:id/move with a status and a position. Optimistic, rolled back with a toast on failure. */
export function useBoardMove(sprintId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = useRefreshSprints();
  const key = sprintKeys.board(sprintId);

  return useMutation({
    mutationFn: ({ todo, status, position }: BoardMoveVars) => todosApi.move(todo.id, { status, position }),

    onMutate: async ({ todo, status, position }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SprintBoardResponse>(key);
      if (previous) {
        const columns = {} as Record<TodoStatus, Todo[]>;
        for (const s of TODO_STATUSES) columns[s] = previous.columns[s].filter((t) => t.id !== todo.id);
        const moved: Todo = { ...todo, status, completedAt: status === 'done' ? (todo.completedAt ?? new Date().toISOString()) : null };
        columns[status].splice(Math.min(Math.max(position, 0), columns[status].length), 0, moved);
        qc.setQueryData(key, withStats({ ...previous, columns }));
      }
      return { previous };
    },

    onError: (e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast(t('move.failedCard', { msg: e.message }), 'error');
    },
    onSettled: () => refresh(),
  });
}
