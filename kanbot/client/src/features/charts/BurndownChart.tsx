import { addDays, formatDay } from '../../lib/format';
import { t } from '../../i18n';
import type { Burndown } from './burndown';
import { formatNumber, niceScale, useChartWidth } from './chartUtils';

const H = 240;
const M = { top: 14, right: 16, bottom: 28, left: 40 };

/** Remaining work per day (solid) against the ideal straight line to zero (dashed). */
export function BurndownChart({ data, label }: { data: Burndown; label: string }) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const iw = width - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const scale = niceScale(data.total);
  const X = (x: number) => M.left + (x / data.days) * iw;
  const Y = (v: number) => M.top + ih - (v / scale.max) * ih;

  const actual = data.points.filter((p) => p.actual !== null);
  const dayStep = Math.max(1, Math.ceil(data.days / 7));
  const dayTicks = data.points.filter((p) => p.x >= 1 && (p.x - 1) % dayStep === 0);
  const showDots = data.days <= 31;

  return (
    <div ref={ref} className="chart-wrap">
      <svg className="chart-svg" width={width} height={H} role="img" aria-label={label}>
        {scale.ticks.map((v) => (
          <g key={v}>
            <line className="chart-grid" x1={M.left} x2={width - M.right} y1={Y(v)} y2={Y(v)} />
            <text x={M.left - 8} y={Y(v)} textAnchor="end" dominantBaseline="middle">{formatNumber(v)}</text>
          </g>
        ))}
        {dayTicks.map((p) => (
          <text key={p.x} x={X(p.x)} y={H - 8} textAnchor="middle">{formatDay(addDays(data.startDay, p.x - 1))}</text>
        ))}
        <polyline className="chart-ideal" points={data.points.map((p) => `${X(p.x)},${Y(p.ideal)}`).join(' ')} />
        {actual.length > 1 && <polyline className="chart-actual" points={actual.map((p) => `${X(p.x)},${Y(p.actual!)}`).join(' ')} />}
        {actual.map((p, i) =>
          showDots || i === actual.length - 1 ? (
            <circle key={p.x} className="chart-dot" cx={X(p.x)} cy={Y(p.actual!)} r={i === actual.length - 1 ? 5 : 3}>
              <title>{`${p.x === 0 ? '' : `${formatDay(addDays(data.startDay, p.x - 1))}: `}${formatNumber(p.actual!)}`}</title>
            </circle>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export const burndownLabels = (data: Burndown) => ({
  remaining: t(data.unit === 'points' ? 'burndown.remainingPoints' : 'burndown.remainingTasks', { left: formatNumber(data.remaining), total: formatNumber(data.total) }),
  series: t(data.unit === 'points' ? 'burndown.actualPoints' : 'burndown.actualTasks'),
});
