import { CalendarDays, CheckCheck } from 'lucide-react';
import { Button } from '../../components/Button';
import { daysLeftLabel, formatRange } from '../../lib/format';
import { rich, t } from '../../i18n';
import type { Sprint } from '../../types/api';

export function progressPercent(s: Sprint['stats']) {
  if (s.totalPoints > 0) return Math.round((s.donePoints / s.totalPoints) * 100);
  return s.totalTodos > 0 ? Math.round((s.doneTodos / s.totalTodos) * 100) : 0;
}

/** SPR-4: goal, dates, days left and progress. */
export function SprintHeader({ sprint, onComplete }: { sprint: Sprint; onComplete: () => void }) {
  const { stats } = sprint;
  const pct = progressPercent(stats);
  return (
    <section className="board-head" aria-label={t('sprint.summaryAria')}>
      <div className="board-head-top">
        <div className="sprint-title">
          <h2>{sprint.name}</h2>
          {sprint.goal && <p className="goal">{sprint.goal}</p>}
        </div>
        <div className="sprint-meta">
          <span><CalendarDays size={14} /> {formatRange(sprint.startDate, sprint.endDate)}</span>
          {sprint.endDate && <strong>{daysLeftLabel(sprint.endDate)}</strong>}
        </div>
        <Button onClick={onComplete}><CheckCheck size={16} /> {t('sprint.complete')}</Button>
      </div>
      <div className="progress-row">
        <div className="progress" role="progressbar" aria-label={t('sprint.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">
          {rich(t('sprint.progressLabel', { pct, dp: stats.donePoints, tp: stats.totalPoints, dt: stats.doneTodos, tt: stats.totalTodos }))}
        </span>
      </div>
    </section>
  );
}
