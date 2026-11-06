import type { Sprint } from '../../types/api';

export type VelocityBar = { id: string; name: string; total: number; completed: number };
export type Velocity = {
  unit: 'points' | 'tasks';
  bars: VelocityBar[];
  /** Average completed work over the last `window` sprints. */
  average: number;
  window: number;
};

const AVG_WINDOW = 3;

/** Velocity across completed sprints, from the `completedStats` snapshot taken when each sprint was completed. */
export function computeVelocity(sprints: Sprint[], limit = 10): Velocity | null {
  const done = sprints
    .filter((s): s is Sprint & { completedStats: NonNullable<Sprint['completedStats']> } => s.status === 'completed' && !!s.completedStats)
    .sort((a, b) => (a.completedAt ?? a.endDate ?? '').localeCompare(b.completedAt ?? b.endDate ?? ''))
    .slice(-limit);
  if (done.length === 0) return null;

  const unit = done.some((s) => s.completedStats.totalPoints > 0) ? 'points' : 'tasks';
  const bars = done.map((s) => ({
    id: s.id,
    name: s.name,
    total: unit === 'points' ? s.completedStats.totalPoints : s.completedStats.totalTodos,
    completed: unit === 'points' ? s.completedStats.donePoints : s.completedStats.doneTodos,
  }));
  const window = Math.min(AVG_WINDOW, bars.length);
  const average = bars.slice(-window).reduce((sum, b) => sum + b.completed, 0) / window;
  return { unit, bars, average, window };
}
