import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { t } from '../../i18n';
import { readJson, writeJson } from '../../lib/storage';
import type { Sprint, Todo } from '../../types/api';
import { computeBurndown } from './burndown';
import { BurndownChart, burndownLabels } from './BurndownChart';

const OPEN_KEY = 'kanbot.burndown.open';
const PACE = { ahead: 'burndown.ahead', behind: 'burndown.behind', onTrack: 'burndown.onTrack' } as const;

/** Burndown of the active sprint, computed from the todos' `completedAt`. Collapsible; the choice is remembered. */
export function BurndownCard({ sprint, todos }: { sprint: Sprint; todos: Todo[] }) {
  const [open, setOpen] = useState(() => readJson<boolean>(OPEN_KEY, true));
  const toggle = () => {
    setOpen(!open);
    writeJson(OPEN_KEY, !open);
  };
  const result = computeBurndown(sprint, todos);
  const labels = result.ok ? burndownLabels(result) : null;

  return (
    <section className="chart-card" aria-label={t('burndown.title')}>
      <header className="chart-head">
        <h3>
          <button type="button" className="chart-toggle" aria-expanded={open} onClick={toggle}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} className="flip-rtl" />}
            {t('burndown.title')}
          </button>
        </h3>
        {result.ok && <span className={`chart-badge ${result.pace}`}>{t(PACE[result.pace])}</span>}
        {labels && <span className="chart-meta">{labels.remaining}</span>}
      </header>

      {open &&
        (result.ok && labels ? (
          <>
            <BurndownChart data={result} label={t('burndown.aria', { summary: labels.remaining })} />
            <div className="chart-legend" aria-hidden="true">
              <span><i className="chart-key actual" /> {labels.series}</span>
              <span><i className="chart-key ideal" /> {t('burndown.ideal')}</span>
            </div>
            <p className="chart-note">{t('burndown.note')}</p>
          </>
        ) : (
          <p className="chart-note">{t(result.ok || result.reason === 'empty' ? 'burndown.empty' : 'burndown.noDates')}</p>
        ))}
    </section>
  );
}
