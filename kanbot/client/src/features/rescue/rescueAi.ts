import { getLang } from '../../i18n';
import { rank, finishPlan, orderByDependencies, ruleBasedPlan, withinCapacity, type Dependency, type PlanItem, type RescueAnalysis, type RescuePlan, type RescueTask } from '../../lib/rescue';
import { PRIORITY_LABEL } from '../../lib/todo';
import type { ChatMessage } from '../../types/api';

/** The chat API accepts at most 4000 characters per message. */
const MAX_MESSAGE = 4000;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

export type AiRescue = {
  summary: string;
  keep: { key: string; reason: string }[];
  defer: { key: string; reason: string }[];
  split: { key: string; suggestion: string }[];
  dependencies: Dependency[];
  risks: string[];
};

const SHAPE =
  '{"summary":string,"keep":[{"key":string,"reason":string}],"defer":[{"key":string,"reason":string}],' +
  '"split":[{"key":string,"suggestion":string}],"dependencies":[{"key":string,"dependsOn":string}],"risks":[string]}';

/**
 * One chat message with everything the AI needs: time left, capacity, and every open task on a single line.
 * Tasks that do not fit in 4000 characters are left out (most important first) and handled by the rules.
 */
export function rescuePrompt(a: RescueAnalysis, sprintName: string): { text: string; included: number } {
  const lang = getLang() === 'ar' ? 'Arabic' : 'English';
  const head = [
    'You are a sprint rescue assistant. Reply with ONE JSON object and nothing else: no markdown, no code fence.',
    `Sprint "${clip(oneLine(sprintName), 60)}": ${a.workDays} working day(s) left, ${a.hoursPerDay}h available per day, capacity ${a.capacity} points, remaining effort ${a.remainingEffort} points, ${a.lateCount} task(s) late.`,
    `Write every text value in ${lang}. Keep task keys exactly as given.`,
    'Rules: "keep" is the order to work in. Total effort of "keep" must not exceed capacity (urgent tasks may go over). Every task goes in exactly one of "keep" or "defer". A task cannot be kept if something it depends on is deferred. "dependencies" only between listed keys, only ones you can infer from titles or descriptions. At most 3 "split" and 3 "risks". Each text value at most 140 characters.',
    `JSON shape: ${SHAPE}`,
    'Tasks, one per line: key | priority | status | effort left (points) | late? | depends on | title — description',
  ];
  const tail = 40;
  const lines: string[] = [];
  let size = head.join('\n').length + tail;
  const sorted = [...a.tasks].sort((x, y) => rank(y) - rank(x));
  for (const t of sorted) {
    const desc = oneLine(t.todo.description);
    const line = [
      t.todo.key,
      PRIORITY_LABEL[t.todo.priority],
      t.todo.status,
      t.effort,
      t.late ? 'late' : '-',
      t.blockedBy.join(',') || '-',
      `${clip(oneLine(t.todo.title), 70)}${desc ? ` — ${clip(desc, 90)}` : ''}`,
    ].join(' | ');
    if (size + line.length + 1 > MAX_MESSAGE) break;
    lines.push(line);
    size += line.length + 1;
  }
  const rest = sorted.length - lines.length;
  return { text: [...head, ...lines, ...(rest > 0 ? [`(+${rest} lower-ranked tasks omitted)`] : [])].join('\n'), included: lines.length };
}

export const rescueMessages = (text: string): ChatMessage[] => [{ role: 'user', content: text }];

const str = (v: unknown, max = 200) => (typeof v === 'string' ? clip(oneLine(v), max) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const keyOf = (v: unknown) => str(v, 20).toUpperCase();

/** Reads the model's answer. Tolerates a code fence or text around the JSON; returns null when there is no usable plan. */
export function parseAiRescue(content: string): AiRescue | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
  const o = rec(raw);
  const keep = arr(o.keep).map((x) => ({ key: keyOf(rec(x).key ?? x), reason: str(rec(x).reason) })).filter((x) => x.key);
  const defer = arr(o.defer).map((x) => ({ key: keyOf(rec(x).key ?? x), reason: str(rec(x).reason) })).filter((x) => x.key);
  if (keep.length === 0 && defer.length === 0) return null;
  return {
    summary: str(o.summary, 400),
    keep,
    defer,
    split: arr(o.split).map((x) => ({ key: keyOf(rec(x).key), suggestion: str(rec(x).suggestion, 200) })).filter((x) => x.key && x.suggestion).slice(0, 3),
    dependencies: arr(o.dependencies).map((x) => ({ key: keyOf(rec(x).key), dependsOn: keyOf(rec(x).dependsOn) })).filter((x) => x.key && x.dependsOn).slice(0, 30),
    risks: arr(o.risks).map((x) => str(x, 200)).filter(Boolean).slice(0, 3),
  };
}

/**
 * Turns the AI's answer into a plan the app can trust. The AI chooses and explains; the rules guard it:
 *  - unknown or repeated keys are ignored; tasks it forgot get the rule-based decision;
 *  - dependencies it found are added (only between open tasks, never a task on itself);
 *  - if the kept work is over capacity, the lowest-ranked non-urgent tasks are deferred;
 *  - a task never stays kept while something it waits for is deferred;
 *  - the work order always respects dependencies.
 */
export function mergeAiPlan(a: RescueAnalysis, ai: AiRescue): RescuePlan {
  const fallback = ruleBasedPlan(a);
  const open = new Set(a.tasks.map((t) => t.todo.key));

  // 1. Add the AI's dependencies to each task.
  const extra = ai.dependencies.filter((d) => open.has(d.key) && open.has(d.dependsOn) && d.key !== d.dependsOn);
  const tasks: RescueTask[] = a.tasks.map((t) => ({
    ...t,
    blockedBy: [...new Set([...t.blockedBy, ...extra.filter((d) => d.key === t.todo.key).map((d) => d.dependsOn)])],
  }));
  const byKey = new Map(tasks.map((t) => [t.todo.key, t]));

  // 2. Decide keep / defer per task: the AI's choice, else the rules'.
  const note = new Map<string, string>();
  const decision = new Map<string, 'keep' | 'defer'>();
  const order: string[] = [];
  for (const x of ai.keep) {
    if (!open.has(x.key) || decision.has(x.key)) continue;
    decision.set(x.key, 'keep');
    order.push(x.key);
    if (x.reason) note.set(x.key, x.reason);
  }
  for (const x of ai.defer) {
    if (!open.has(x.key) || decision.has(x.key)) continue;
    decision.set(x.key, 'defer');
    if (x.reason) note.set(x.key, x.reason);
  }
  for (const item of fallback.keep) {
    const k = item.task.todo.key;
    if (decision.has(k)) continue;
    decision.set(k, 'keep');
    order.push(k);
  }
  for (const t of tasks) if (!decision.has(t.todo.key)) decision.set(t.todo.key, 'defer');

  // 3. Guard rails.
  const cause = new Map<string, 'capacity' | 'blocked'>();
  const keptTasks = () => tasks.filter((t) => decision.get(t.todo.key) === 'keep');
  let effort = keptTasks().reduce((n, t) => n + t.effort, 0);
  const trim = keptTasks().filter((t) => t.todo.priority !== 'urgent').sort((x, y) => rank(x) - rank(y));
  while (!withinCapacity(effort, a.capacity) && trim.length) {
    const t = trim.shift()!;
    decision.set(t.todo.key, 'defer');
    cause.set(t.todo.key, 'capacity');
    effort -= t.effort;
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const t of keptTasks()) {
      if (t.blockedBy.some((b) => decision.get(b) === 'defer')) {
        decision.set(t.todo.key, 'defer');
        cause.set(t.todo.key, 'blocked');
        changed = true;
      }
    }
  }
  // Never an empty sprint while there is work left.
  if (keptTasks().length === 0 && fallback.keep[0]) decision.set(fallback.keep[0].task.todo.key, 'keep');

  // 4. Build the lists.
  const item = (t: RescueTask, kind: 'keep' | 'defer'): PlanItem => {
    const ruleItem = (kind === 'keep' ? fallback.keep : fallback.defer).find((i) => i.task.todo.key === t.todo.key);
    const base = ruleItem ?? { code: kind === 'keep' ? ('value' as const) : (cause.get(t.todo.key) ?? 'capacity') };
    const code = kind === 'defer' ? (cause.get(t.todo.key) ?? base.code) : base.code;
    return { task: t, code, via: ruleItem?.via, note: note.get(t.todo.key) };
  };
  const keepOrdered = orderByDependencies(order.map((k) => byKey.get(k)!).filter((t) => decision.get(t.todo.key) === 'keep'));
  const keep = keepOrdered.map((t) => item(t, 'keep'));
  const defer = tasks.filter((t) => decision.get(t.todo.key) === 'defer').sort((x, y) => rank(y) - rank(x)).map((t) => item(t, 'defer'));
  const split = ai.split.filter((s) => open.has(s.key));

  return finishPlan({ source: 'ai', summary: ai.summary, keep, defer, split, risks: ai.risks }, a);
}
