import { t } from '../i18n';
import { PRIORITY_LABEL, TYPE_LABEL } from './todo';
import { TODO_PRIORITIES, type Todo } from '../types/api';

/** The chat API accepts at most 4000 characters per message. */
const MAX_MESSAGE = 4000;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

type ImproveInput = Pick<Todo, 'key' | 'title' | 'description' | 'type' | 'priority' | 'storyPoints' | 'labels'>;

/** "Improve this todo": ask for a better title, description and acceptance criteria. */
export function improveTodoPrompt(todo: ImproveInput): string {
  const lines = [
    t('chat.improve.intro', { key: todo.key }),
    '',
    `${t('common.title')}: ${clip(oneLine(todo.title), 300)}`,
    `${t('common.type')}: ${TYPE_LABEL[todo.type]}`,
    `${t('common.priority')}: ${PRIORITY_LABEL[todo.priority]}`,
    `${t('common.storyPoints')}: ${todo.storyPoints ?? t('todo.noEstimate')}`,
  ];
  if (todo.labels.length) lines.push(`${t('common.labels')}: ${todo.labels.join(', ')}`);
  lines.push('', `${t('common.description')}:`, clip(todo.description.trim() || t('chat.noDescription'), 2500));
  return clip(lines.join('\n'), MAX_MESSAGE);
}

/** "Estimate": one message listing todos without story points, most important first, within the 4000 character limit. */
export function estimatePrompt(todos: Todo[]): { text: string; included: number; total: number } {
  const rank = (p: Todo['priority']) => TODO_PRIORITIES.indexOf(p); // low = 0 … urgent = 3
  const sorted = [...todos].sort((a, b) => rank(b.priority) - rank(a.priority)); // urgent first (the sort is stable)
  const intro = t('chat.estimate.intro');
  const reserve = 60; // room for the "+N more" line
  const lines: string[] = [];
  let size = intro.length + 2;

  for (const todo of sorted) {
    const desc = oneLine(todo.description);
    const line = `- ${todo.key} [${TYPE_LABEL[todo.type]}, ${PRIORITY_LABEL[todo.priority]}] ${clip(oneLine(todo.title), 120)}${desc ? ` — ${clip(desc, 140)}` : ''}`;
    if (size + line.length + 1 > MAX_MESSAGE - reserve) break;
    lines.push(line);
    size += line.length + 1;
  }

  const rest = sorted.length - lines.length;
  const text = [intro, '', ...lines, ...(rest > 0 ? ['', t('chat.estimate.more', { n: rest })] : [])].join('\n');
  return { text, included: lines.length, total: sorted.length };
}
