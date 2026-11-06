import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { t } from '../i18n';
import { Button } from './Button';
import { useToast } from './Toast';

export type ExportItem = { label: string; run: () => void | Promise<void> };

/**
 * A button that opens a small menu of export formats. Click, Enter or Space opens it; arrow keys move between items;
 * Esc closes it. Errors thrown by an item (for example a failed request) are shown as a toast.
 */
export function ExportMenu({ items }: { items: ExportItem[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) wrap.current?.querySelector<HTMLElement>('.export-trigger')?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!open) return;
    const els = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    }
  };

  const run = async (item: ExportItem) => {
    close(true);
    setBusy(true);
    try {
      await item.run();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('err.generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrap} className="export-wrap" onKeyDown={onKeyDown}>
      <Button variant="ghost" className="export-trigger" loading={busy} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {!busy && <Download size={16} />} {t('export.label')} <ChevronDown size={14} />
      </Button>
      {open && (
        <ul className="menu" role="menu">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button type="button" role="menuitem" onClick={() => run(it)}>{it.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
