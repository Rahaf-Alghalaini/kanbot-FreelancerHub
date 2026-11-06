import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { keepPreviousData, useQueries } from '@tanstack/react-query';
import { Plus, Search, Sparkles } from 'lucide-react';
import { todosApi } from '../../api/todos';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/Loader';
import { useDebounce } from '../../hooks/useDebounce';
import { rich, t, tpb } from '../../i18n';
import { useMoveTodo } from '../../hooks/useMoveTodo';
import { useProject } from '../../hooks/useProjects';
import { boardCollision } from '../../lib/dnd';
import { useSprintsQuery } from '../../hooks/useSprints';
import { todoKeys, useTodosQuery } from '../../hooks/useTodos';
import { PRIORITY_LABEL, TYPE_LABEL } from '../../lib/todo';
import { GenerateTodosDialog } from '../ai/GenerateTodosDialog';
import { PlanSprintDialog } from '../ai/PlanSprintDialog';
import { DeleteSprintDialog } from '../sprints/DeleteSprintDialog';
import { SprintFormDialog } from '../sprints/SprintFormDialog';
import { SprintSection } from '../sprints/SprintSection';
import { StartSprintDialog } from '../sprints/StartSprintDialog';
import { TodoDetailsDialog } from '../todos/TodoDetailsDialog';
import { TypeIcon } from '../todos/TypeIcon';
import { TODO_PRIORITIES, TODO_TYPES, type Sprint, type Todo, type TodoPriority, type TodoType } from '../../types/api';
import { QuickCreate } from './QuickCreate';
import { TodoList } from './TodoList';

export function BacklogPage() {
  const project = useProject();
  const move = useMoveTodo(project.id);

  // Sprints (SPR-1)
  const { data: sprintData, error: sprintsError } = useSprintsQuery(project.id);
  const sprints = sprintData?.sprints ?? [];
  const planned = sprints.filter((s) => s.status === 'planned');
  const active = sprints.find((s) => s.status === 'active');
  const [formState, setFormState] = useState<{ open: boolean; sprint: Sprint | null }>({ open: false, sprint: null });
  const [deleting, setDeleting] = useState<Sprint | null>(null);
  const [starting, setStarting] = useState<Sprint | null>(null);
  const [aiDialog, setAiDialog] = useState<'generate' | 'plan' | null>(null);

  // Backlog with filters (BL-1, BL-6)
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), 300);
  const [priority, setPriority] = useState<TodoPriority | ''>('');
  const [type, setType] = useState<TodoType | ''>('');
  const filtered = !!(priority || type || searchInput.trim());
  const clearFilters = () => { setPriority(''); setType(''); setSearchInput(''); };
  const backlogQ = useTodosQuery(project.id, { sprintId: 'backlog', priority: priority || undefined, type: type || undefined, search: search || undefined });
  const backlog = backlogQ.data?.todos ?? [];
  const backlogPoints = backlog.reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  // One list per planned sprint
  const sprintQs = useQueries({
    queries: planned.map((s) => ({
      queryKey: todoKeys.list(project.id, { sprintId: s.id }),
      queryFn: () => todosApi.list(project.id, { sprintId: s.id }),
      placeholderData: keepPreviousData,
    })),
  });
  const lists: Record<string, Todo[]> = { backlog };
  planned.forEach((s, i) => { lists[s.id] = sprintQs[i]?.data?.todos ?? []; });
  const targets = [{ id: 'backlog', label: t('nav.backlog') }, ...planned.map((s) => ({ id: s.id, label: s.name }))];

  const [selected, setSelected] = useState<Todo | null>(null);
  const [dragging, setDragging] = useState<Todo | null>(null);

  const findList = (todoId: string) => Object.keys(lists).find((k) => lists[k].some((t) => t.id === todoId));

  // Menu actions
  const moveTo = (todo: Todo, listId: string) =>
    move.mutate({ todo, sprintId: listId === 'backlog' ? null : listId, position: Infinity, via: 'patch' }); // BL-7
  const reorder = (todo: Todo, position: number) => move.mutate({ todo, sprintId: todo.sprintId, position, via: 'move' }); // BL-5

  // Drag and drop (BL-5)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragStart = (e: DragStartEvent) => {
    const from = findList(String(e.active.id));
    setDragging(from ? lists[from].find((t) => t.id === e.active.id) ?? null : null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findList(activeId);
    if (!from) return;
    const todo = lists[from].find((t) => t.id === activeId)!;

    let to: string | undefined;
    let position: number;
    if (overId.startsWith('list:')) {
      to = overId.slice(5);
      position = to === 'backlog' ? project.stats.backlogCount : (lists[to]?.length ?? 0);
      if (from === to) position = lists[to].length - 1;
    } else {
      to = findList(overId);
      if (!to) return;
      position = lists[to].findIndex((t) => t.id === overId);
    }
    if (to === 'backlog' && filtered) {
      if (from === 'backlog') return; // reordering a filtered list is ambiguous
      position = project.stats.backlogCount;
    }
    if (from === to && lists[from].findIndex((t) => t.id === activeId) === position) return;
    move.mutate({ todo, sprintId: to === 'backlog' ? null : to, position, via: 'move' });
  };

  const listProps = { targets, onOpen: setSelected, onMoveTo: moveTo, onReorder: reorder };

  return (
    <DndContext sensors={sensors} collisionDetection={boardCollision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="toolbar">
        <p>{rich(tpb('n.plannedSprint', planned.length))}</p>
        <div className="toolbar-actions">
          <Button variant="ghost" onClick={() => setAiDialog('generate')}><Sparkles size={16} /> {t('backlog.generate')}</Button>
          <Button variant="ghost" onClick={() => setAiDialog('plan')}><Sparkles size={16} /> {t('backlog.plan')}</Button>
          <Button onClick={() => setFormState({ open: true, sprint: null })}><Plus size={16} /> {t('backlog.newSprint')}</Button>
        </div>
      </div>

      {active && (
        <div className="notice">
          {rich(t('backlog.active', { name: active.name }))} <Link to={`/projects/${project.id}/board`}>{t('backlog.openBoard')}</Link>
        </div>
      )}
      {sprintsError && <div className="banner" role="alert">{sprintsError.message}</div>}

      {planned.map((s) => (
        <SprintSection
          key={s.id}
          sprint={s}
          todos={lists[s.id]}
          blockedBy={active?.name}
          onStart={() => setStarting(s)}
          onEdit={() => setFormState({ open: true, sprint: s })}
          onDelete={() => setDeleting(s)}
        >
          <TodoList listId={s.id} reorderable todos={lists[s.id]} empty={<p className="drop-empty">{t('backlog.dropHere')}</p>} {...listProps} />
        </SprintSection>
      ))}

      <section className="backlog-section" aria-label={t('nav.backlog')}>
        <header className="section-head">
          <h2>{t('nav.backlog')}</h2>
          <p>
            {rich(tpb('n.item', backlog.length))} · {rich(tpb('n.point', backlogPoints))}
            {filtered && ` ${t('common.filtered')}`}
          </p>
        </header>

        <QuickCreate projectId={project.id} />

        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input type="search" aria-label={t('backlog.searchAria')} placeholder={t('backlog.searchPh')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </label>
          <select aria-label={t('backlog.filterPriority')} value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority | '')}>
            <option value="">{t('backlog.allPriorities')}</option>
            {TODO_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
          <select aria-label={t('backlog.filterType')} value={type} onChange={(e) => setType(e.target.value as TodoType | '')}>
            <option value="">{t('backlog.allTypes')}</option>
            {TODO_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          {filtered && <Button variant="ghost" onClick={clearFilters}>{t('backlog.clear')}</Button>}
        </div>

        {backlogQ.isLoading && <PageLoader label={t('backlog.loading')} />}
        {backlogQ.error && !backlogQ.data && (
          <div className="banner" role="alert">
            {backlogQ.error.message}
            <Button variant="ghost" onClick={() => backlogQ.refetch()}>{t('common.tryAgain')}</Button>
          </div>
        )}
        {backlogQ.data && (
          <TodoList
            listId="backlog"
            reorderable={!filtered}
            infinite
            resetKey={`${priority}|${type}|${search}`}
            todos={backlog}
            empty={
              <EmptyState
                title={filtered ? t('backlog.noMatch') : t('backlog.empty')}
                description={filtered ? t('backlog.noMatchDesc') : t('backlog.emptyDesc')}
                action={filtered ? <Button variant="ghost" onClick={clearFilters}>{t('backlog.clearFilters')}</Button> : undefined}
              />
            }
            {...listProps}
          />
        )}
      </section>

      {createPortal(
        <DragOverlay dropAnimation={{ duration: 120 }}>
        {dragging && (
          <div className="todo-row drag-overlay">
            <TypeIcon type={dragging.type} />
            <span className="todo-key">{dragging.key}</span>
            <span className="todo-title">{dragging.title}</span>
          </div>
        )}
        </DragOverlay>,
        document.body,
      )}

      <GenerateTodosDialog open={aiDialog === 'generate'} projectId={project.id} onClose={() => setAiDialog(null)} />
      <PlanSprintDialog open={aiDialog === 'plan'} projectId={project.id} onClose={() => setAiDialog(null)} />
      <TodoDetailsDialog todo={selected} onClose={() => setSelected(null)} />
      <SprintFormDialog open={formState.open} sprint={formState.sprint} projectId={project.id} onClose={() => setFormState((s) => ({ ...s, open: false }))} />
      <DeleteSprintDialog sprint={deleting} onClose={() => setDeleting(null)} />
      <StartSprintDialog sprint={starting} projectId={project.id} taskCount={starting ? (lists[starting.id]?.length ?? 0) : 0} onClose={() => setStarting(null)} />
    </DndContext>
  );
}
