import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '../../api/client';
import { Button } from '../../components/Button';
import { ExportMenu } from '../../components/ExportMenu';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/Loader';
import { useToast } from '../../components/Toast';
import { useProject } from '../../hooks/useProjects';
import { useSprintBoardQuery } from '../../hooks/useSprints';
import { downloadFile, slug, sprintToMarkdown, todosToCsv } from '../../lib/export';
import { formatDate, formatRange } from '../../lib/format';
import { t } from '../../i18n';
import { STATUS_LABEL } from '../../lib/todo';
import { SprintSummaryCard } from '../ai/SprintSummaryCard';
import { BurndownCard } from '../charts/BurndownCard';
import { progressPercent } from '../board/SprintHeader';
import { PriorityBadge } from '../todos/PriorityBadge';
import { TypeIcon } from '../todos/TypeIcon';
import { TODO_STATUSES } from '../../types/api';
import { SprintStatusPill } from './SprintStatusPill';

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="tile"><small>{label}</small><strong>{value}</strong>{sub && <span>{sub}</span>}</div>
);

/** SPR-7: one sprint with stats tiles and its tasks. */
export function SprintDetailsPage() {
  const project = useProject();
  const toast = useToast();
  const { sprintId } = useParams();
  const { data, isLoading, error, refetch } = useSprintBoardQuery(sprintId);
  const back = <Link className="back-link" to={`/projects/${project.id}/sprints`}><ArrowLeft size={14} className="flip-rtl" /> {t('sprint.allSprints')}</Link>;

  if (isLoading) return <PageLoader label={t('sprint.loading')} />;
  if (error instanceof ApiError && error.status === 404)
    return <EmptyState title={t('sprint.notFound')} description={t('sprint.notFoundDesc')} action={back} />;
  if (error || !data)
    return (
      <div className="banner" role="alert">
        {error?.message ?? t('sprint.loadFail')}
        <Button variant="ghost" onClick={() => refetch()}>{t('common.tryAgain')}</Button>
      </div>
    );

  const { sprint, columns } = data;
  const stats = sprint.completedStats ?? sprint.stats;
  const pct = progressPercent(stats);

  const exportSprint = (format: 'md' | 'csv') => {
    const name = `${project.key}-${slug(sprint.name)}.${format}`;
    if (format === 'md') downloadFile(name, sprintToMarkdown(sprint, columns), 'text/markdown');
    else downloadFile(name, todosToCsv(TODO_STATUSES.flatMap((s) => columns[s]), { [sprint.id]: sprint.name }), 'text/csv');
    toast(t('export.done', { name }), 'success');
  };

  return (
    <>
      {back}
      <header className="details-head">
        <div className="sprint-title">
          <h2>{sprint.name} <SprintStatusPill status={sprint.status} /></h2>
          {sprint.goal && <p className="goal">{sprint.goal}</p>}
          <p className="due">
            {formatRange(sprint.startDate, sprint.endDate)}
            {sprint.completedAt && ` · ${t('sprint.completedOn', { date: formatDate(sprint.completedAt) })}`}
          </p>
        </div>
        <div className="head-actions">
          <ExportMenu items={[{ label: t('export.sprintMd'), run: () => exportSprint('md') }, { label: t('export.sprintCsv'), run: () => exportSprint('csv') }]} />
          {sprint.status === 'active' && <Link className="btn btn-primary" to={`/projects/${project.id}/board`}>{t('sprint.openBoard')}</Link>}
        </div>
      </header>

      <div className="tiles">
        <Tile label={t('sprint.tileCompletion')} value={`${pct}%`} />
        <Tile label={t('sprint.tileTasks')} value={`${stats.doneTodos}/${stats.totalTodos}`} />
        <Tile label={t('sprint.tilePoints')} value={`${stats.donePoints}/${stats.totalPoints}`} />
        {sprint.completedStats && <Tile label={t('sprint.tileCarried')} value={String(sprint.completedStats.carriedOver)} sub={t('sprint.tileCarriedSub')} />}
      </div>

      {sprint.status === 'active' && <BurndownCard sprint={sprint} todos={TODO_STATUSES.flatMap((s) => columns[s])} />}

      {sprint.status !== 'planned' && <SprintSummaryCard sprint={sprint} />}

      {TODO_STATUSES.map((s) =>
        columns[s].length === 0 ? null : (
          <section key={s} className="history-group">
            <h2 className="group-title">{STATUS_LABEL[s]} <span>{columns[s].length}</span></h2>
            <ul className="todo-list">
              {columns[s].map((t) => (
                <li key={t.id} className="todo-row static">
                  <TypeIcon type={t.type} />
                  <span className="todo-key">{t.key}</span>
                  <span className="todo-title">{t.title}</span>
                  <span className="todo-meta"><PriorityBadge priority={t.priority} /><span className="points">{t.storyPoints ?? '–'}</span></span>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
      {stats.totalTodos === 0 && <EmptyState title={t('sprint.noTasks')} />}
    </>
  );
}
