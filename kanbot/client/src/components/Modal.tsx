import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '../i18n';

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose; // always the latest, without re-running the effects below
  });

  // Focus the first field when the dialog opens, and give focus back to what opened it when it closes.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const root = ref.current;
    (root?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select') ?? root?.querySelector<HTMLElement>('button'))?.focus();
    return () => prev?.focus();
  }, [open]);

  // Esc closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCloseRef.current();
      if (e.key !== 'Tab' || !ref.current) return;
      const items = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = ref.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}
