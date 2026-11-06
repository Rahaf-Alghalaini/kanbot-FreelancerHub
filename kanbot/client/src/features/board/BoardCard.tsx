import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { formatDay } from '../../lib/format';
import { t } from '../../i18n';
import { PriorityBadge } from '../todos/PriorityBadge';
import { TypeIcon } from '../todos/TypeIcon';
import type { Todo } from '../../types/api';

/** The whole card is the drag target (click still opens it). Keyboard: focus the card, Space to pick up. */
export function BoardCard({ todo, onOpen }: { todo: Todo; onOpen: (t: Todo) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };

  return (
    <article
      ref={(el) => {
        setNodeRef(el);
        setActivatorNodeRef(el); // keyboard drag only starts when the card itself is focused, not its inner buttons
      }}
      style={style}
      className="board-card"
      aria-label={`${todo.key} ${todo.title}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-line">
        <TypeIcon type={todo.type} />
        <span className="todo-key">{todo.key}</span>
        <GripVertical size={16} className="grip" aria-hidden />
      </div>
      <button type="button" className="card-main" onClick={() => onOpen(todo)}>
        <span className={`card-title ${todo.status === 'done' ? 'is-done' : ''}`}>{todo.title}</span>
        {todo.labels.length > 0 && <span className="card-labels">{todo.labels.slice(0, 3).map((l) => <span key={l} className="chip">{l}</span>)}</span>}
        <span className="card-foot">
          <PriorityBadge priority={todo.priority} />
          {todo.dueDate && <span className="due">{t('todo.due', { date: formatDay(todo.dueDate) })}</span>}
          <span className="points" title={t('common.storyPoints')}>{todo.storyPoints ?? '–'}</span>
        </span>
      </button>
    </article>
  );
}
