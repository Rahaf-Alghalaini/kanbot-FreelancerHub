import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { t } from '../../i18n';
import { STATUS_LABEL } from '../../lib/todo';
import type { Todo, TodoStatus } from '../../types/api';
import { BoardCard } from './BoardCard';

/** The whole column is the drop target, so you can drop anywhere inside it. */
export function BoardColumn({ status, todos, onOpen }: { status: TodoStatus; todos: Todo[]; onOpen: (t: Todo) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <section ref={setNodeRef} className={`column col-${status} ${isOver ? 'is-over' : ''}`} aria-label={STATUS_LABEL[status]}>
      <header className="col-head">
        <span className="col-title"><span className="dot" />{STATUS_LABEL[status]}</span>
        <span className="col-count">{todos.length}</span>
      </header>
      <div className="col-body">
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {todos.map((t) => <BoardCard key={t.id} todo={t} onOpen={onOpen} />)}
        </SortableContext>
        {todos.length === 0 && <p className="drop-empty">{t('board.dropHere')}</p>}
      </div>
    </section>
  );
}
