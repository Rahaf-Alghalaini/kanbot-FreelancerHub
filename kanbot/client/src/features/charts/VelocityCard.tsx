import { t } from '../../i18n';
import type { Sprint } from '../../types/api';
import { formatNumber } from './chartUtils';
import { computeVelocity } from './velocity';
import { VelocityChart } from './VelocityChart';

/** Velocity across completed sprints (from each sprint's `completedStats`). Renders nothing until a sprint is completed. */
export function VelocityCard({ sprints }: { sprints: Sprint[] }) {
  const data = computeVelocity(sprints);
  if (!data) return null;

  const summary = t(data.unit === 'points' ? 'velocity.summaryPoints' : 'velocity.summaryTasks', { avg: formatNumber(data.average) });
  const windowText = data.window === 1 ? t('velocity.window1') : data.window === 2 ? t('velocity.window2') : t('velocity.window3', { n: data.window });

  return (
    <section className="chart-card" aria-label={t('velocity.title')}>
      <header className="chart-head">
        <h3>{t('velocity.title')}</h3>
        <span className="chart-meta">{summary}</span>
      </header>
      <VelocityChart data={data} label={t('velocity.aria', { summary })} />
      <div className="chart-legend" aria-hidden="true">
        <span><i className="chart-swatch total" /> {t('velocity.total')}</span>
        <span><i className="chart-swatch done" /> {t('velocity.completed')}</span>
        <span><i className="chart-key avg" /> {t('velocity.average')}</span>
      </div>
      <p className="chart-note">{windowText}</p>
    </section>
  );
}
