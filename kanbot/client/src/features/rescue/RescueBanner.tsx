import { LifeBuoy } from 'lucide-react';
import { Button } from '../../components/Button';
import { t } from '../../i18n';
import { analyzeSprint, DEFAULT_HOURS_PER_DAY } from '../../lib/rescue';
import { readJson } from '../../lib/storage';
import type { Sprint, Todo } from '../../types/api';

/** Shown on the board when the sprint is slipping: late tasks, behind the ideal burndown, or more work than time. */
export function RescueBanner({ sprint, todos, onOpen }: { sprint: Sprint; todos: Todo[]; onOpen: () => void }) {
  const a = analyzeSprint(sprint, todos, { hoursPerDay: readJson<number>('kanbot.rescue.hoursPerDay', DEFAULT_HOURS_PER_DAY) });
  if (!a || a.risk === 'ok' || a.tasks.length === 0) return null;
  return (
    <section className={`rescue-banner risk-${a.risk}`} role="status">
      <LifeBuoy size={20} />
      <div>
        <strong>{t(`rescue.risk.${a.risk}`)}</strong>
        <p>{t('rescue.bannerDesc')}</p>
      </div>
      <Button onClick={onOpen}>{t('rescue.open')}</Button>
    </section>
  );
}
