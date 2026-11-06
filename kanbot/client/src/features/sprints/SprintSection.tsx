import type { ReactNode } from 'react';
import { Pencil, Play, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { formatRange } from '../../lib/format';
import { rich, t, tpb } from '../../i18n';
import type { Sprint, Todo } from '../../types/api';

type Props = {
  sprint: Sprint;
  todos: Todo[];
  blockedBy?: string; // name of the active sprint that prevents starting this one
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode; // the sortable task list
};

/** A planned sprint above the backlog (SPR-1). Counts come from the list on screen so they follow drag and drop instantly. */
export function SprintSection({ sprint, todos, blockedBy, onStart, onEdit, onDelete, children }: Props) {
  const points = todos.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

  return (
    <section className="sprint-section" aria-label={sprint.name}>
      <header className="sprint-head">
        <div className="sprint-title">
          <h2>{sprint.name}</h2>
          {sprint.goal && <p className="goal">{sprint.goal}</p>}
        </div>
        <div className="sprint-meta">
          <span>{formatRange(sprint.startDate, sprint.endDate)}</span>
          <span>{rich(tpb('n.item', todos.length))} · {rich(tpb('n.point', points))}</span>
        </div>
        <div className="sprint-actions">
          <Button onClick={onStart} disabled={!!blockedBy}>
            <Play size={14} /> {t('sprint.start')}
          </Button>
          <button className="icon-btn" aria-label={t('common.edit', { name: sprint.name })} onClick={onEdit}><Pencil size={16} /></button>
          <button className="icon-btn" aria-label={t('common.deleteName', { name: sprint.name })} onClick={onDelete}><Trash2 size={16} /></button>
        </div>
      </header>
      {blockedBy && <p className="start-hint" role="note">{t('sprint.blocked', { name: blockedBy })}</p>}
      {children}
    </section>
  );
}
