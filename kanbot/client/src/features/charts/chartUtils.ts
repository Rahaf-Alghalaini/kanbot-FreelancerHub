import { useLayoutEffect, useRef, useState } from 'react';
import { localeOf } from '../../i18n';

/** A "nice" y axis: the smallest whole-number step (1, 2, 5, 10, 20, 50, …) that covers `maxValue` in at most `maxIntervals` steps. */
export function niceScale(maxValue: number, maxIntervals = 5) {
  const top = Math.max(maxValue, 1);
  let step = 1;
  for (let pow = 1; ; pow *= 10) {
    const found = [1, 2, 5].map((m) => m * pow).find((s) => top / s <= maxIntervals);
    if (found) {
      step = found;
      break;
    }
  }
  const max = Math.ceil(top / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  return { max, step, ticks };
}

/** One decimal at most, in the current language's digits. */
export const formatNumber = (n: number) => n.toLocaleString(localeOf(), { maximumFractionDigits: 1 });

/** Width of an element, kept up to date, so the SVG is drawn at its real pixel size (crisp text, no stretching). */
export function useChartWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
