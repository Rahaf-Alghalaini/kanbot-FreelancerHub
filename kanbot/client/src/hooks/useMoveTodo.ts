import { useMutation, useQueryClient } from '@tanstack/react-query';
import { todosApi } from '../api/todos';
import { useToast } from '../components/Toast';
import { t } from '../i18n';
import { todoKeys, useRefreshTodos } from './useTodos';
import type { Todo, TodoListQuery, TodoListResponse } from '../types/api';

/**
 * via 'move'  → POST /todos/:id/move  (drag and drop, "Move to top")   BL-5
 * via 'patch' → PATCH /todos/:id      (menu "Move to Sprint 3")        BL-7
 * `position` is the index in the target list (Infinity = end).
 */
export type MoveVars = { todo: Todo; sprintId: string | null; position: number; via: 'move' | 'patch' };

/** Optimistic: every cached list is updated at once; on failure all of them are restored and a toast is shown. */
export function useMoveTodo(projectId: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = useRefreshTodos();

  return useMutation({
    mutationFn: ({ todo, sprintId, position, via }: MoveVars) =>
      via === 'patch' ? todosApi.update(todo.id, { sprintId }) : todosApi.move(todo.id, { sprintId, position }),

    onMutate: async ({ todo, sprintId, position }) => {
      await qc.cancelQueries({ queryKey: todoKeys.all });
      const snapshots = qc.getQueriesData<TodoListResponse>({ queryKey: ['todos', 'list', projectId] });
      const target = sprintId ?? 'backlog';
      for (const [key, data] of snapshots) {
        if (!data) continue;
        const listId = (key[3] as TodoListQuery | undefined)?.sprintId;
        const rest = data.todos.filter((t) => t.id !== todo.id);
        if (listId === target) rest.splice(Math.min(Math.max(position, 0), rest.length), 0, { ...todo, sprintId });
        qc.setQueryData<TodoListResponse>(key, { todos: rest });
      }
      return { snapshots };
    },

    onError: (e, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast(t('move.failedTask', { msg: e.message }), 'error');
    },
    onSettled: () => refresh(),
  });
}
