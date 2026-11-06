import { t } from '../../i18n';
import { formatNumber, niceScale, useChartWidth } from './chartUtils';
import type { Velocity } from './velocity';

const H = 240;
const M = { top: 18, right: 16, bottom: 34, left: 40 };
const short = (s: string, n = 10) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Grouped bars per completed sprint: total in the sprint (light) next to what was completed (solid), plus the average. */
export function VelocityChart({ data, label }: { data: Velocity; label: string }) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const iw = width - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const scale = niceScale(Math.max(...data.bars.flatMap((b) => [b.total, b.completed]), data.average));
  const band = iw / data.bars.length;
  const barW = Math.max(6, Math.min(30, band * 0.34));
  const Y = (v: number) => M.top + ih - (v / scale.max) * ih;

  return (
    <div ref={ref} className="chart-wrap">
      <svg className="chart-svg" width={width} height={H} role="img" aria-label={label}>
        {scale.ticks.map((v) => (
          <g key={v}>
            <line className="chart-grid" x1={M.left} x2={width - M.right} y1={Y(v)} y2={Y(v)} />
            <text x={M.left - 8} y={Y(v)} textAnchor="end" dominantBaseline="middle">{formatNumber(v)}</text>
          </g>
        ))}
        {data.bars.map((b, i) => {
          const cx = M.left + band * i + band / 2;
          return (
            <g key={b.id}>
              <title>{t('velocity.barTitle', { name: b.name, done: formatNumber(b.completed), total: formatNumber(b.total) })}</title>
              <rect className="chart-bar-total" x={cx - barW - 1} y={Y(b.total)} width={barW} height={Math.max(0, Y(0) - Y(b.total))} rx={4} />
              <rect className="chart-bar-done" x={cx + 1} y={Y(b.completed)} width={barW} height={Math.max(0, Y(0) - Y(b.completed))} rx={4} />
              <text className="chart-value" x={cx + 1 + barW / 2} y={Y(b.completed) - 5} textAnchor="middle">{formatNumber(b.completed)}</text>
              <text x={cx} y={H - 12} textAnchor="middle">{short(b.name, band < 70 ? 7 : 12)}</text>
            </g>
          );
        })}
        <line className="chart-avg" x1={M.left} x2={width - M.right} y1={Y(data.average)} y2={Y(data.average)} />
      </svg>
    </div>
  );
}
