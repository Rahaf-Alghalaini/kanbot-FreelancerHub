import { localeOf, t, tp } from '../i18n';

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(localeOf(), { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

/** Date-only values (YYYY-MM-DD) shown in local time, without a timezone shift. */
export const formatDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(localeOf(), { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d));
};

const pad = (n: number) => String(n).padStart(2, '0');
export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toDay(new Date());
export const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return toDay(new Date(y, m - 1, d + n));
};

/** Whole days from one YYYY-MM-DD to another (negative if `to` is earlier). */
export const daysBetween = (from: string, to: string) => {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};

export const daysLeftLabel = (endDate: string) => {
  const n = daysBetween(todayISO(), endDate);
  if (n > 0) return tp('sprint.daysLeft', n);
  if (n === 0) return t('sprint.endsToday');
  return tp('sprint.overdue', -n);
};

export const formatRange = (start: string | null, end: string | null) => (start && end ? `${formatDay(start)} – ${formatDay(end)}` : t('sprint.datesNotSet'));
