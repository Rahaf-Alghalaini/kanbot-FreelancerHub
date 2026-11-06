import { addDays, daysBetween, toDay, todayISO } from '../../lib/format';
import type { Sprint, Todo } from '../../types/api';

export type BurndownUnit = 'points' | 'tasks';
export type BurndownPoint = {
  /** 0 = start of the sprint, n = end of sprint day n (1-based). */
  x: number;
  ideal: number;
  /** null for days that have not happened yet. */
  actual: number | null;
};
export type Burndown = {
  unit: BurndownUnit;
  total: number;
  days: number;
  startDay: string;
  points: BurndownPoint[];
  /** Remaining work today. */
  remaining: number;
  pace: 'ahead' | 'behind' | 'onTrack';
};
export type BurndownResult = ({ ok: true } & Burndown) | { ok: false; reason: 'noDates' | 'empty' };

/**
 * Burndown for one sprint, computed from the todos in it: the work remaining at the end of each day is the total
 * minus everything whose `completedAt` falls on or before that day. The total is the scope of the sprint today
 * (the API does not keep a history of scope changes). Story points are used when any todo has them, otherwise tasks.
 */
export function computeBurndown(sprint: Sprint, todos: Todo[], today: string = todayISO()): BurndownResult {
  const start = sprint.startDate ?? (sprint.startedAt ? toDay(new Date(sprint.startedAt)) : null);
  const end = sprint.endDate ?? (start ? addDays(start, 14) : null);
  if (!start || !end) return { ok: false, reason: 'noDates' };

  const unit: BurndownUnit = todos.some((t) => (t.storyPoints ?? 0) > 0) ? 'points' : 'tasks';
  const weight = (t: Todo) => (unit === 'points' ? (t.storyPoints ?? 0) : 1);
  const total = todos.reduce((s, t) => s + weight(t), 0);
  if (total === 0) return { ok: false, reason: 'empty' };

  const days = Math.max(1, daysBetween(start, end) + 1);

  // Work finished per day index (1 = first sprint day). Work done before the sprint counts on day 1.
  const doneOn = new Map<number, number>();
  for (const t of todos) {
    if (t.status !== 'done' || !t.completedAt) continue;
    const x = Math.max(1, daysBetween(start, toDay(new Date(t.completedAt))) + 1);
    doneOn.set(x, (doneOn.get(x) ?? 0) + weight(t));
  }

  // The last day with data: today, but never past the end of the sprint, and 0 before it starts.
  const lastX = Math.min(days, Math.max(0, daysBetween(start, today) + 1));
  const points: BurndownPoint[] = [];
  let done = 0;
  for (let x = 0; x <= days; x++) {
    done += doneOn.get(x) ?? 0;
    points.push({ x, ideal: total * (1 - x / days), actual: x <= lastX ? total - done : null });
  }

  const now = points[lastX];
  const remaining = now.actual ?? total;
  const tolerance = Math.max(0.5, total * 0.05);
  const gap = remaining - now.ideal;
  const pace = gap > tolerance ? 'behind' : gap < -tolerance ? 'ahead' : 'onTrack';
  return { ok: true, unit, total, days, startDay: start, points, remaining, pace };
}
