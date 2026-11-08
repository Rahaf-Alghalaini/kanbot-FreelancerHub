import { computeBurndown } from '../features/charts/burndown';
import { addDays, daysBetween, todayISO } from './format';
import type { Sprint, Todo, TodoPriority } from '../types/api';

/**
 * Sprint Rescue Mode: the rule-based part.
 *
 * Everything here is pure and deterministic. It produces a complete rescue plan on its own; the AI only refines it
 * (see `features/rescue/rescueAi.ts`), so the feature still works when the AI is slow, down or returns nonsense.
 */

/** One story point is assumed to take this many focused hours. Used to turn "hours per day" into points per day. */
export const HOURS_PER_POINT = 2;
/** Effort assumed for a task without an estimate. */
export const UNESTIMATED_POINTS = 3;
export const DEFAULT_HOURS_PER_DAY = 4;
/** Estimates are rough: a plan may use up to this much of the computed capacity before it counts as over it. */
export const CAPACITY_SLACK = 1.1;
export const withinCapacity = (effort: number, capacity: number) => effort <= capacity * CAPACITY_SLACK + 1e-9;

const PRIORITY_WEIGHT: Record<TodoPriority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
/** Share of a task's points still left to do, by column. A card in review is almost finished. */
const REMAINING_SHARE = { todo: 1, in_progress: 0.5, in_review: 0.25, done: 0 } as const;

export type Dependency = { key: string; dependsOn: string };

export type RescueTask = {
  todo: Todo;
  /** Points left to do (estimate × how far along the card is). */
  effort: number;
  late: boolean;
  /** Keys of unfinished tasks this one waits for. */
  blockedBy: string[];
};

export type Risk = 'ok' | 'atRisk' | 'critical';

export type RescueAnalysis = {
  today: string;
  endDay: string;
  /** Working days left, today included; at least 1 while the sprint is running. */
  workDays: number;
  daysLeft: number;
  overdue: boolean;
  hoursPerDay: number;
  pointsPerDay: number;
  /** What the user can realistically finish in the time left. */
  capacity: number;
  /** Observed pace so far (points finished per elapsed day), and what that pace would give over the days left. */
  observedPace: number;
  paceCapacity: number;
  totalTasks: number;
  doneTasks: number;
  tasks: RescueTask[];
  remainingEffort: number;
  lateCount: number;
  unestimated: number;
  behindPace: boolean;
  risk: Risk;
  /** Effort divided by capacity; above 1 the plan cannot fit as it stands. */
  load: number;
};

export type ReasonCode = 'unblocks' | 'urgent' | 'late' | 'inFlight' | 'value' | 'blocked' | 'capacity';

export type PlanItem = {
  task: RescueTask;
  /** Why the task is in this list, as a code the UI translates. */
  code: ReasonCode;
  /** For `unblocks`: the key of the task this one makes possible. */
  via?: string;
  /** The AI's own wording, when it gave one. It wins over the code in the UI. */
  note?: string;
};

/** `continued` is true when the task was already started on an earlier day. */
export type ScheduleDay = { day: string; items: { item: PlanItem; continued: boolean }[]; effort: number };

export type RescuePlan = {
  source: 'ai' | 'rules';
  summary: string;
  keep: PlanItem[]; // in the order they should be worked on
  defer: PlanItem[];
  split: { key: string; suggestion: string }[];
  risks: string[];
  schedule: ScheduleDay[];
  keepEffort: number;
  /** Urgent work can push the plan past capacity; the UI warns when this is true. */
  overCapacity: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const points = (t: Todo) => t.storyPoints ?? UNESTIMATED_POINTS;

/** Keys written inside titles/descriptions ("depends on KAN-3", "after KAN-3") become dependency edges. */
export function extractDependencies(todos: Todo[]): Dependency[] {
  const keys = new Set(todos.map((t) => t.key));
  const edges: Dependency[] = [];
  for (const t of todos) {
    const text = `${t.title} ${t.description}`;
    for (const m of text.matchAll(/\b[A-Z][A-Z0-9]{1,5}-\d+\b/g)) {
      if (m[0] !== t.key && keys.has(m[0]) && !edges.some((e) => e.key === t.key && e.dependsOn === m[0]))
        edges.push({ key: t.key, dependsOn: m[0] });
    }
  }
  return edges;
}

/** Looks at one active sprint and says how far off track it is. `todos` are all the todos currently in the sprint. */
export function analyzeSprint(
  sprint: Sprint,
  todos: Todo[],
  opts: { hoursPerDay: number; extraDependencies?: Dependency[]; today?: string },
): RescueAnalysis | null {
  const today = opts.today ?? todayISO();
  const burndown = computeBurndown(sprint, todos, today);
  const start = sprint.startDate;
  const endDay = sprint.endDate ?? (start ? addDays(start, 14) : null);
  if (!start || !endDay) return null;

  const daysLeft = daysBetween(today, endDay);
  const overdue = daysLeft < 0;
  const workDays = overdue ? 0 : Math.max(1, daysLeft);
  const hoursPerDay = Math.max(0.5, opts.hoursPerDay);
  const pointsPerDay = hoursPerDay / HOURS_PER_POINT;
  const capacity = round1(pointsPerDay * workDays);

  const open = todos.filter((t) => t.status !== 'done');
  const openKeys = new Set(open.map((t) => t.key));
  const edges = [...extractDependencies(todos), ...(opts.extraDependencies ?? [])];
  const blockers = (key: string) => [...new Set(edges.filter((e) => e.key === key && openKeys.has(e.dependsOn) && e.dependsOn !== key).map((e) => e.dependsOn))];

  const tasks: RescueTask[] = open.map((todo) => ({
    todo,
    effort: round1(points(todo) * REMAINING_SHARE[todo.status]),
    late: !!todo.dueDate && todo.dueDate < today,
    blockedBy: blockers(todo.key),
  }));
  const remainingEffort = round1(tasks.reduce((n, t) => n + t.effort, 0));

  const elapsed = Math.max(1, daysBetween(start, today) + 1);
  const donePoints = todos.filter((t) => t.status === 'done').reduce((n, t) => n + points(t), 0);
  const observedPace = round1(donePoints / elapsed);
  const paceCapacity = round1(observedPace * workDays);

  const load = capacity > 0 ? remainingEffort / capacity : remainingEffort > 0 ? Infinity : 0;
  const behindPace = burndown.ok && burndown.pace === 'behind';
  const lateCount = tasks.filter((t) => t.late).length;
  const risk: Risk = overdue || load > 1.3 ? 'critical' : load > 1 || behindPace || lateCount > 0 ? 'atRisk' : 'ok';

  return {
    today, endDay, workDays, daysLeft, overdue, hoursPerDay, pointsPerDay, capacity, observedPace, paceCapacity,
    totalTasks: todos.length,
    doneTasks: todos.length - open.length,
    tasks, remainingEffort, lateCount,
    unestimated: tasks.filter((t) => t.todo.storyPoints === null).length,
    behindPace, risk, load,
  };
}

/** Importance per unit of effort: high priority and late tasks first, nearly-done cards are cheap wins. */
export const rank = (t: RescueTask) => (PRIORITY_WEIGHT[t.todo.priority] * 2 + (t.late ? 1 : 0)) / Math.max(t.effort, 0.5);

/**
 * Orders tasks so every task comes after the tasks it waits for. `order` is the preferred order; a dependency cycle
 * cannot be sorted, so its members simply keep their preferred order at the end.
 */
export function orderByDependencies(order: RescueTask[]): RescueTask[] {
  const byKey = new Map(order.map((t) => [t.todo.key, t]));
  const out: RescueTask[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (t: RescueTask) => {
    const s = state.get(t.todo.key);
    if (s) return; // done, or a cycle: skip the edge
    state.set(t.todo.key, 'visiting');
    for (const b of t.blockedBy) {
      const dep = byKey.get(b);
      if (dep) visit(dep);
    }
    state.set(t.todo.key, 'done');
    out.push(t);
  };
  order.forEach(visit);
  return out;
}

/**
 * Fills the days left, in order, with the tasks to keep. Each day holds `pointsPerDay` of work; a big task carries
 * over to the next day, and the last day absorbs any overflow.
 */
export function buildSchedule(keep: PlanItem[], a: RescueAnalysis): ScheduleDay[] {
  if (a.workDays === 0 || keep.length === 0) return [];
  const n = a.workDays;
  const days: ScheduleDay[] = Array.from({ length: n }, (_, i) => ({ day: addDays(a.today, i), items: [], effort: 0 }));
  let index = 0;
  let free = a.pointsPerDay;
  for (const item of keep) {
    let left = item.task.effort;
    let first = true;
    while (left > 1e-9) {
      const chunk = index >= n - 1 ? left : Math.min(left, free);
      days[index].items.push({ item, continued: !first });
      days[index].effort = round1(days[index].effort + chunk);
      left -= chunk;
      free -= chunk;
      first = false;
      if (free <= 1e-9 && index < n - 1) {
        index += 1;
        free = a.pointsPerDay;
      }
    }
  }
  return days.filter((d) => d.items.length > 0);
}

/**
 * The rule-based rescue plan. Steps:
 *  1. Rank open tasks (priority, lateness, effort left).
 *  2. Keep them in that order while they fit the capacity, pulling in the unfinished tasks they depend on.
 *  3. Urgent tasks are always kept, even when that goes over capacity.
 *  4. A task whose blocker was deferred is deferred with it.
 */
export function ruleBasedPlan(a: RescueAnalysis): RescuePlan {
  const byKey = new Map(a.tasks.map((t) => [t.todo.key, t]));
  const kept = new Map<string, string>(); // key → key of the task it unblocks ('' when kept on its own merit)
  // Urgent tasks first (they are kept anyway, so they must claim capacity before anything else), then by value per effort.
  const isUrgent = (t: RescueTask) => (t.todo.priority === 'urgent' ? 1 : 0);
  const ranked = [...a.tasks].sort((x, y) => isUrgent(y) - isUrgent(x) || rank(y) - rank(x));
  let used = 0;

  const chain = (t: RescueTask, seen = new Set<string>()): RescueTask[] => {
    if (seen.has(t.todo.key)) return [];
    seen.add(t.todo.key);
    return [...t.blockedBy.flatMap((k) => (byKey.get(k) ? chain(byKey.get(k)!, seen) : [])), t];
  };

  for (const task of ranked) {
    if (kept.has(task.todo.key)) continue;
    const needed = chain(task).filter((x) => !kept.has(x.todo.key));
    const cost = needed.reduce((n, x) => n + x.effort, 0);
    const urgent = task.todo.priority === 'urgent';
    if (withinCapacity(used + cost, a.capacity) || urgent) {
      for (const x of needed) kept.set(x.todo.key, x.todo.key === task.todo.key ? '' : task.todo.key);
      used += cost;
    }
  }
  // Never end up with an empty sprint when there is work left.
  if (kept.size === 0 && ranked[0]) kept.set(ranked[0].todo.key, '');

  const codeFor = (t: RescueTask): ReasonCode => {
    if (t.todo.priority === 'urgent') return 'urgent';
    if (t.late) return 'late';
    if (t.todo.status === 'in_review' || t.todo.status === 'in_progress') return 'inFlight';
    return 'value';
  };
  const keepTasks = orderByDependencies(ranked.filter((t) => kept.has(t.todo.key)));
  const keep: PlanItem[] = keepTasks.map((task) => {
    const via = kept.get(task.todo.key) ?? '';
    return via ? { task, code: 'unblocks', via } : { task, code: codeFor(task) };
  });
  const defer: PlanItem[] = ranked
    .filter((t) => !kept.has(t.todo.key))
    .map((task) => ({ task, code: task.blockedBy.some((b) => !kept.has(b)) ? 'blocked' : 'capacity' }));

  return finishPlan({ source: 'rules', summary: '', keep, defer, split: [], risks: [] }, a);
}

/** Adds the totals and the day-by-day schedule to a plan. */
export function finishPlan(p: Pick<RescuePlan, 'source' | 'summary' | 'keep' | 'defer' | 'split' | 'risks'>, a: RescueAnalysis): RescuePlan {
  const keepEffort = round1(p.keep.reduce((n, i) => n + i.task.effort, 0));
  return { ...p, schedule: buildSchedule(p.keep, a), keepEffort, overCapacity: !withinCapacity(keepEffort, a.capacity) };
}
