import { en } from './en';
import { ar } from './ar';

export type Lang = 'en' | 'ar';
export type Key = keyof typeof en;
/** A plural family such as 'n.task' (it has 'n.task.one', 'n.task.other', …). */
export type PluralBase = Key extends `${infer B}.other` ? B : never;
type Vars = Record<string, string | number>;

const STORE = 'kanbot.lang';
const dicts: Record<Lang, Record<string, string>> = { en, ar };

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    /* storage blocked: fall through */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

let current: Lang = detect();

export const getLang = () => current;
export const dirOf = (l: Lang = current) => (l === 'ar' ? 'rtl' : 'ltr');
/** Arabic uses Latin digits, to match the numbers drawn elsewhere in the UI. */
export const localeOf = (l: Lang = current) => (l === 'ar' ? 'ar-u-nu-latn' : 'en');

export function applyLang(l: Lang) {
  document.documentElement.lang = l;
  document.documentElement.dir = dirOf(l);
}

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(STORE, l);
  } catch {
    /* ignore */
  }
  applyLang(l);
}

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

/** Translate a key. `{name}` placeholders are replaced from `vars`. */
export function t(key: Key, vars?: Vars): string {
  return fill(dicts[current][key] ?? en[key], vars);
}

/** Plural-aware translate: picks `base.one|two|few|many|other` for the current language. `{n}` is the count. */
export function tp(base: PluralBase, n: number, vars?: Vars): string {
  const rule = new Intl.PluralRules(current).select(n);
  const d = dicts[current];
  const s = d[`${base}.${rule}`] ?? d[`${base}.other`] ?? en[`${base}.other` as Key];
  return fill(s, { n, ...vars });
}

/** Like `tp`, with the number wrapped in <b>…</b> (render the result with `rich`). */
export const tpb = (base: PluralBase, n: number, vars?: Vars) => tp(base, n, { ...vars, n: `<b>${n}</b>` });
