import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical } from 'lucide-react';
import { formatDay } from '../../lib/format';
import { t as tr } from '../../i18n';
import { STATUS_LABEL } from '../../lib/todo';
import { PriorityBadge } from '../todos/PriorityBadge';
import { TypeIcon } from '../todos/TypeIcon';
import type { Todo } from '../../types/api';

export type MoveTarget = { id: string; label: string }; // id = 'backlog' or a sprint id
type MenuItem = { label: string; run: () => void };

type Props = {
  todo: Todo;
  index: number;
  count: number; // length of the list this row is in
  listId: string;
  targets: MoveTarget[];
  reorderable: boolean; // false while the backlog is filtered (positions would be ambiguous)
  onOpen: (t: Todo) => void;
  onMoveTo: (t: Todo, listId: string) => void;
  onReorder: (t: Todo, position: number) => void;
};

export function TodoRow({ todo, index, count, listId, targets, reorderable, onOpen, onMoveTo, onReorder }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  // Menu alternative to dragging (BL-5, BL-7)
  const items: MenuItem[] = [];
  if (reorderable && index > 0) items.push({ label: tr('menu.top'), run: () => onReorder(todo, 0) }, { label: tr('menu.up'), run: () => onReorder(todo, index - 1) });
  if (reorderable && index < count - 1) items.push({ label: tr('menu.down'), run: () => onReorder(todo, index + 1) }, { label: tr('menu.bottom'), run: () => onReorder(todo, count - 1) });
  targets.filter((t) => t.id !== listId).forEach((t) => items.push({ label: tr('menu.moveTo', { name: t.label }), run: () => onMoveTo(todo, t.id) }));

  return (
    <li ref={setNodeRef} style={style} className="todo-item">
      <button ref={setActivatorNodeRef} type="button" className="drag-handle" aria-label={tr('todo.drag', { key: todo.key })} {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <button type="button" className="todo-row" onClick={() => onOpen(todo)}>
        <TypeIcon type={todo.type} />
        <span className="todo-key">{todo.key}</span>
        <span className="todo-title">{todo.title}</span>
        <span className="todo-meta">
          {todo.status !== 'todo' && <span className={`chip status-chip s-${todo.status}`}>{STATUS_LABEL[todo.status]}</span>}
          {todo.labels.slice(0, 3).map((l) => <span key={l} className="chip">{l}</span>)}
          {todo.dueDate && <span className="due">{tr('todo.due', { date: formatDay(todo.dueDate) })}</span>}
          <PriorityBadge priority={todo.priority} />
          <span className="points" title={tr('common.storyPoints')}>{todo.storyPoints ?? '–'}</span>
        </span>
      </button>
      {items.length > 0 && <RowMenu label={tr('todo.actions', { key: todo.key })} items={items} />}
    </li>
  );
}

/**
 * Opens with a click, Enter or Space; arrow keys move between items; Esc closes and returns focus to the button.
 * The menu is drawn in <body> with fixed position, so a scrolling list can never clip it.
 */
function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ x: number; rtl: boolean; top?: number; bottom?: number } | null>(null);
  const open = pos !== null;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const close = useCallback(() => setPos(null), []);

  const toggle = () => {
    if (open || !trigger.current) return close();
    const r = trigger.current.getBoundingClientRect();
    const flip = r.bottom + items.length * 40 + 16 > window.innerHeight; // not enough room below: open upwards
    const rtl = document.documentElement.dir === 'rtl'; // the menu lines up with the button's outer edge
    setPos({ rtl, x: rtl ? r.left : window.innerWidth - r.right, ...(flip ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  };

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !trigger.current?.contains(t)) close();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true); // any scroll would leave the menu in the wrong place
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  // React events bubble through portals, so this also receives keys pressed inside the menu
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!open) return;
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      trigger.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    }
  };

  return (
    <div className="row-menu" onKeyDown={onKeyDown}>
      <button ref={trigger} type="button" className="icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <MoreVertical size={16} />
      </button>
      {pos &&
        createPortal(
          <ul ref={menu} className="menu floating" role="menu" style={menuStyle(pos)}>
            {items.map((it) => (
              <li key={it.label} role="none">
                <button type="button" role="menuitem" onClick={() => { close(); it.run(); }}>{it.label}</button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

function menuStyle(pos: { x: number; rtl: boolean; top?: number; bottom?: number }): CSSProperties {
  const side: CSSProperties = pos.rtl ? { left: pos.x, right: 'auto' } : { right: pos.x, left: 'auto' };
  return { ...side, top: pos.top ?? 'auto', bottom: pos.bottom ?? 'auto' };
}
