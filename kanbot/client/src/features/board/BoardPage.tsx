import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/Loader';
import { useBoardMove } from '../../hooks/useBoardMove';
import { useProject } from '../../hooks/useProjects';
import { t } from '../../i18n';
import { boardCollision } from '../../lib/dnd';
import { useSprintBoardQuery, useSprintsQuery } from '../../hooks/useSprints';
import { SprintSummaryCard } from '../ai/SprintSummaryCard';
import { CompleteSprintDialog } from '../sprints/CompleteSprintDialog';
import { TodoDetailsDialog } from '../todos/TodoDetailsDialog';
import { TypeIcon } from '../todos/TypeIcon';
import { TODO_STATUSES, type Todo, type TodoStatus } from '../../types/api';
import { BoardColumn } from './BoardColumn';
import { SprintHeader } from './SprintHeader';

export function BoardPage() {
  const project = useProject();
  const { data, isLoading, error, refetch } = useSprintsQuery(project.id);
  const active = data?.sprints.find((s) => s.status === 'active');
  const planned = data?.sprints.filter((s) => s.status === 'planned').length ?? 0;

  if (isLoading) return <PageLoader label={t('board.loading')} />;
  if (error)
    return (
      <div className="banner" role="alert">
        {error.message}
        <Button variant="ghost" onClick={() => refetch()}>{t('common.tryAgain')}</Button>
      </div>
    );
  if (!active)
    return (
      <EmptyState
        title={t('board.noActive')}
        description={planned > 0 ? t('board.noActivePlanned') : t('board.noActiveDesc')}
        action={<Link className="btn btn-primary" to={`/projects/${project.id}/backlog`}>{t('common.goBacklog')}</Link>}
      />
    );
  return <ActiveBoard projectId={project.id} sprintId={active.id} />;
}

function ActiveBoard({ projectId, sprintId }: { projectId: string; sprintId: string }) {
  const { data, isLoading, error, refetch } = useSprintBoardQuery(sprintId); // SPR-4
  const move = useBoardMove(sprintId);
  const [selected, setSelected] = useState<Todo | null>(null);
  const [dragging, setDragging] = useState<Todo | null>(null);
  const [completing, setCompleting] = useState(false);
  // Mouse: drag after 5px. Touch: press and hold 150ms (so the page can still scroll). Keyboard: Space on a focused card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const justDragged = useRef(false); // a drop must not also count as a click that opens the card
  const endDrag = () => { setDragging(null); setTimeout(() => { justDragged.current = false; }, 150); };

  if (isLoading) return <PageLoader label={t('board.loading')} />;
  if (error || !data)
    return (
      <div className="banner" role="alert">
        {error?.message ?? t('board.loadFail')}
        <Button variant="ghost" onClick={() => refetch()}>{t('common.tryAgain')}</Button>
      </div>
    );

  const { sprint, columns } = data;
  const findColumn = (todoId: string) => TODO_STATUSES.find((s) => columns[s].some((t) => t.id === todoId));

  const onDragStart = (e: DragStartEvent) => {
    justDragged.current = true;
    const from = findColumn(String(e.active.id));
    setDragging(from ? columns[from].find((t) => t.id === e.active.id) ?? null : null);
  };

  // SPR-5: between and within columns
  const onDragEnd = (e: DragEndEvent) => {
    endDrag();
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findColumn(activeId);
    if (!from) return;
    const todo = columns[from].find((t) => t.id === activeId)!;

    let to: TodoStatus | undefined;
    let position: number;
    if (overId.startsWith('col:')) {
      to = overId.slice(4) as TodoStatus;
      position = from === to ? columns[to].length - 1 : columns[to].length; // dropped on empty space: end of the column
    } else {
      to = findColumn(overId);
      if (!to) return;
      position = columns[to].findIndex((t) => t.id === overId);
    }
    if (from === to && columns[from].findIndex((t) => t.id === activeId) === position) return;
    move.mutate({ todo, status: to, position });
  };

  return (
    <>
      <SprintHeader sprint={sprint} onComplete={() => setCompleting(true)} />
      <SprintSummaryCard sprint={sprint} />
      <DndContext sensors={sensors} collisionDetection={boardCollision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={endDrag}>
        <div className="board">
          {TODO_STATUSES.map((s) => <BoardColumn key={s} status={s} todos={columns[s]} onOpen={(t) => { if (!justDragged.current) setSelected(t); }} />)}
        </div>
        {createPortal(
          <DragOverlay dropAnimation={{ duration: 120 }}>
          {dragging && (
            <div className="board-card drag-overlay">
              <div className="card-line"><TypeIcon type={dragging.type} /><span className="todo-key">{dragging.key}</span></div>
              <span className="card-title">{dragging.title}</span>
            </div>
          )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      <TodoDetailsDialog todo={selected} onClose={() => setSelected(null)} />
      <CompleteSprintDialog sprint={completing ? sprint : null} projectId={projectId} onClose={() => setCompleting(false)} />
    </>
  );
}
