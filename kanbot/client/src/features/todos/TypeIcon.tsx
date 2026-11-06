import { Bookmark, Bug, CheckSquare } from 'lucide-react';
import { TYPE_LABEL } from '../../lib/todo';
import type { TodoType } from '../../types/api';

const ICONS = { task: CheckSquare, story: Bookmark, bug: Bug } as const;

export function TypeIcon({ type, size = 16 }: { type: TodoType; size?: number }) {
  const Icon = ICONS[type];
  return (
    <span className={`type-icon type-${type}`} title={TYPE_LABEL[type]}>
      <Icon size={size} role="img" aria-label={TYPE_LABEL[type]} />
    </span>
  );
}
