import { PRIORITY_LABEL } from '../../lib/todo';
import type { TodoPriority } from '../../types/api';

export function PriorityBadge({ priority }: { priority: TodoPriority }) {
  return (
    <span className={`badge prio-${priority}`}>
      <span className="dot" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
