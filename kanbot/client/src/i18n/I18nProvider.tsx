import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyLang, dirOf, getLang, setLang as storeLang, type Lang } from './core';

type Dir = 'ltr' | 'rtl';
type Ctx = { lang: Lang; dir: Dir; setLang: (l: Lang) => void };
const I18nContext = createContext<Ctx>({ lang: 'en', dir: 'ltr', setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(getLang);
  useEffect(() => applyLang(lang), [lang]);
  const setLang = useCallback((l: Lang) => {
    storeLang(l);
    set(l);
  }, []);
  const value = useMemo<Ctx>(() => ({ lang, dir: dirOf(lang) as Dir, setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);


export function LangBoundary({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  return <Fragment key={lang}>{children}</Fragment>;
}
