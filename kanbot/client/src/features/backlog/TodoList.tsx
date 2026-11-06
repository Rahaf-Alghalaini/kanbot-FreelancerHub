import { useEffect, useState, type ReactNode } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { t } from '../../i18n';
import { TodoRow, type MoveTarget } from './TodoRow';
import type { Todo } from '../../types/api';

const PAGE = 8;

type Props = {
  listId: string; // 'backlog' or a sprint id
  todos: Todo[];
  targets: MoveTarget[];
  reorderable: boolean;
  /** Long lists: renders 8 rows at a time and appends the next batch as the page scrolls (no inner scrollbar). */
  infinite?: boolean;
  /** When this changes (e.g. a filter), the list goes back to the top. */
  resetKey?: string;
  empty?: ReactNode;
  onOpen: (t: Todo) => void;
  onMoveTo: (t: Todo, listId: string) => void;
  onReorder: (t: Todo, position: number) => void;
};

/** One sortable list that also accepts drops when empty (id `list:<listId>`). */
export function TodoList({ listId, todos, targets, reorderable, infinite = false, resetKey, empty, onOpen, onMoveTo, onReorder }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${listId}` });
  const [limit, setLimit] = useState(PAGE);
  const shown = infinite ? todos.slice(0, limit) : todos; // a prefix, so row indexes equal list positions

  useEffect(() => setLimit(PAGE), [resetKey]);

  // Moving a task far down must keep it rendered
  const reorder = (t: Todo, position: number) => {
    if (position >= limit) setLimit(position + PAGE);
    onReorder(t, position);
  };

  return (
    <div ref={setNodeRef} className={`drop-zone ${isOver ? 'is-over' : ''}`}>
      <InfiniteScroll
        dataLength={shown.length}
        next={() => setLimit((l) => l + PAGE)}
        hasMore={infinite && limit < todos.length}
        loader={<div className="list-more"><span className="spinner" style={{ width: 14, height: 14 }} /> {t('backlog.loadingMore')}</div>}
        scrollThreshold={0.85}
        scrollableTarget="content-scroll" // the fixed card in AppShell scrolls, not the window
        style={{ overflow: 'visible' }} // scroll with the page, not inside the list
      >
        <SortableContext items={shown.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="todo-list">
            {shown.map((t, i) => (
              <TodoRow key={t.id} todo={t} index={i} count={todos.length} listId={listId} targets={targets} reorderable={reorderable} onOpen={onOpen} onMoveTo={onMoveTo} onReorder={reorder} />
            ))}
          </ul>
        </SortableContext>
      </InfiniteScroll>
      {todos.length === 0 && empty}
    </div>
  );
}
