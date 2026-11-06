import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';
type Item = { id: number; kind: Kind; message: string };
type Push = (message: string, kind?: Kind) => void;

const ToastContext = createContext<Push>(() => {});
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback<Push>((message, kind = 'info') => {
    const id = ++nextId;
    setItems((i) => [...i, { id, kind, message }]);
    setTimeout(() => setItems((i) => i.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
