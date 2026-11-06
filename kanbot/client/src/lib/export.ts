import { t } from '../i18n';
import { formatDate, formatRange } from './format';
import { PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from './todo';
import { TODO_STATUSES, type Sprint, type Todo, type TodoStatus } from '../types/api';

/** Saves text as a file through the browser (no server round trip). */
export function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '') || 'export';

// ───────────── CSV ─────────────

type Cell = string | number | null | undefined;
// A text cell starting with one of these could run as a formula when the file is opened in Excel or Sheets.
const FORMULA_START = /^[=+\-@\t\r]/;

const csvCell = (v: Cell) => {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (typeof v === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC 4180 CSV with a UTF-8 byte order mark, so Excel reads Arabic and other non-Latin text correctly. */
export const toCsv = (rows: Cell[][]) => `\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;

const CSV_HEADER = ['Key', 'Title', 'Type', 'Status', 'Priority', 'Story points', 'Labels', 'Due date', 'Sprint', 'Created', 'Completed', 'Description'];

/** One row per todo. Column names and enum values stay in English so the file is easy to import elsewhere. */
export function todosToCsv(todos: Todo[], sprintNames: Record<string, string> = {}) {
  return toCsv([
    CSV_HEADER,
    ...todos.map((x) => [
      x.key, x.title, x.type, x.status, x.priority, x.storyPoints, x.labels.join('; '), x.dueDate,
      x.sprintId ? (sprintNames[x.sprintId] ?? x.sprintId) : '', x.createdAt, x.completedAt, x.description,
    ]),
  ]);
}

// ───────────── Markdown ─────────────

const mdCell = (v: Cell) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
const mdTable = (headers: string[], rows: Cell[][]) =>
  [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`)].join('\n');

const sumPoints = (todos: Todo[]) => todos.reduce((s, x) => s + (x.storyPoints ?? 0), 0);

const todoTable = (todos: Todo[], withLabels: boolean) =>
  mdTable(
    [t('project.key'), t('common.title'), t('common.type'), t('common.priority'), t('common.storyPoints'), ...(withLabels ? [t('common.labels')] : [])],
    todos.map((x) => [x.key, x.title, TYPE_LABEL[x.type], PRIORITY_LABEL[x.priority], x.storyPoints ?? '–', ...(withLabels ? [x.labels.join(', ')] : [])]),
  );

export function backlogToMarkdown(project: { key: string; name: string }, todos: Todo[]) {
  return [
    `# ${t('export.backlogTitle', { project: `${project.key} · ${project.name}` })}`,
    '',
    `_${t('export.exportedOn', { date: formatDate(new Date().toISOString()) })}_ · ${t('export.summaryLine', { n: todos.length, p: sumPoints(todos) })}`,
    '',
    todos.length ? todoTable(todos, true) : t('backlog.empty'),
    '',
  ].join('\n');
}

export function sprintToMarkdown(sprint: Sprint, columns: Record<TodoStatus, Todo[]>) {
  const stats = sprint.completedStats ?? sprint.stats;
  const pct = stats.totalPoints > 0 ? Math.round((stats.donePoints / stats.totalPoints) * 100) : stats.totalTodos > 0 ? Math.round((stats.doneTodos / stats.totalTodos) * 100) : 0;

  const lines = [
    `# ${t('export.sprintTitle', { name: sprint.name })}`,
    '',
    `_${t('export.exportedOn', { date: formatDate(new Date().toISOString()) })}_`,
    '',
    `- **${t('common.status')}:** ${t(`sprint.status.${sprint.status}`)}`,
    `- **${t('export.dates')}:** ${formatRange(sprint.startDate, sprint.endDate)}`,
    ...(sprint.completedAt ? [`- ${t('sprint.completedOn', { date: formatDate(sprint.completedAt) })}`] : []),
    ...(sprint.goal ? [`- **${t('common.goal')}:** ${sprint.goal.replace(/\r?\n/g, ' ')}`] : []),
    '',
    `## ${t('export.progress')}`,
    '',
    `- **${t('sprint.tileCompletion')}:** ${pct}%`,
    `- **${t('sprint.tileTasks')}:** ${stats.doneTodos}/${stats.totalTodos}`,
    `- **${t('sprint.tilePoints')}:** ${stats.donePoints}/${stats.totalPoints}`,
    ...(sprint.completedStats ? [`- **${t('sprint.tileCarried')}:** ${sprint.completedStats.carriedOver}`] : []),
    '',
  ];

  if (sprint.summary) lines.push(`## ${t('summary.title')}`, '', sprint.summary.content.trim(), '');

  lines.push(`## ${t('export.tasks')}`, '');
  const groups = TODO_STATUSES.filter((s) => columns[s].length > 0);
  if (groups.length === 0) lines.push(t('sprint.noTasks'), '');
  for (const s of groups) lines.push(`### ${STATUS_LABEL[s]} (${columns[s].length})`, '', todoTable(columns[s], false), '');
  return lines.join('\n');
}
