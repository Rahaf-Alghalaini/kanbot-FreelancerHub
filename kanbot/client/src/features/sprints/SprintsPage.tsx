import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/Loader';
import { useProject } from '../../hooks/useProjects';
import { useSprintsQuery } from '../../hooks/useSprints';
import { formatDate, formatRange } from '../../lib/format';
import { rich, t, tp } from '../../i18n';
import type { Sprint } from '../../types/api';
import { VelocityCard } from '../charts/VelocityCard';
import { SprintStatusPill } from './SprintStatusPill';

/** SPR-7: GET /projects/:id/sprints (active, planned, then completed newest first). */
export function SprintsPage() {
  const project = useProject();
  const { data, isLoading, error, refetch } = useSprintsQuery(project.id);
  const sprints = data?.sprints ?? [];
  const groups: [string, Sprint[]][] = [
    [t('sprint.status.active'), sprints.filter((s) => s.status === 'active')],
    [t('sprint.status.planned'), sprints.filter((s) => s.status === 'planned')],
    [t('sprint.status.completed'), sprints.filter((s) => s.status === 'completed')],
  ];

  if (isLoading) return <PageLoader label={t('sprints.loading')} />;
  if (error)
    return (
      <div className="banner" role="alert">
        {error.message}
        <Button variant="ghost" onClick={() => refetch()}>{t('common.tryAgain')}</Button>
      </div>
    );
  if (sprints.length === 0)
    return <EmptyState title={t('sprints.none')} description={t('sprints.noneDesc')} action={<Link className="btn btn-primary" to={`/projects/${project.id}/backlog`}>{t('common.goBacklog')}</Link>} />;

  return (
    <>
      <VelocityCard sprints={sprints} />
      {groups.map(([label, list]) =>
        list.length === 0 ? null : (
          <section key={label} className="history-group">
            <h2 className="group-title">{label} <span>{list.length}</span></h2>
            <ul className="sprint-list">
              {list.map((s) => <li key={s.id}><SprintCard sprint={s} projectId={project.id} /></li>)}
            </ul>
          </section>
        ),
      )}
    </>
  );
}

function SprintCard({ sprint, projectId }: { sprint: Sprint; projectId: string }) {
  const s = sprint.completedStats ?? sprint.stats;
  return (
    <Link className="sprint-card" to={`/projects/${projectId}/sprints/${sprint.id}`}>
      <div className="sprint-card-main">
        <div className="sprint-card-title"><h3>{sprint.name}</h3><SprintStatusPill status={sprint.status} /></div>
        {sprint.goal && <p className="goal">{sprint.goal}</p>}
        <p className="due">{formatRange(sprint.startDate, sprint.endDate)}{sprint.completedAt && ` · ${t('sprint.completedOn', { date: formatDate(sprint.completedAt) })}`}</p>
      </div>
      <div className="sprint-card-stats">
        {sprint.status === 'planned' ? (
          <span>{tp('n.task', s.totalTodos)} · {tp('n.point', s.totalPoints)}</span>
        ) : (
          <>
            <span>{rich(t('sprint.tasksDone', { done: s.doneTodos, total: s.totalTodos }))}</span>
            <span>{rich(t('sprint.pointsDone', { done: s.donePoints, total: s.totalPoints }))}</span>
            {sprint.completedStats && sprint.completedStats.carriedOver > 0 && <span>{t('sprint.carried', { n: sprint.completedStats.carriedOver })}</span>}
          </>
        )}
      </div>
    </Link>
  );
}
