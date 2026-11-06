import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
const STORE = 'kanbot.theme';

function detect(): Theme {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked: fall through */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type Ctx = { theme: Theme; toggle: () => void };
const ThemeContext = createContext<Ctx>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(detect);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORE, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
