import { Link, Outlet, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { PageLoader } from '../../components/Loader';
import { useProjectQuery, type ProjectContext } from '../../hooks/useProjects';
import { t } from '../../i18n';

/** Loads /projects/:projectId once and shares it with the pages below via outlet context. */
export function ProjectRoute() {
  const { projectId } = useParams();
  const { data, isLoading, error, refetch } = useProjectQuery(projectId);

  if (isLoading) return <PageLoader label={t('project.loadingOne')} />;
  if (error instanceof ApiError && error.status === 404)
    return <EmptyState title={t('project.notFound')} description={t('project.notFoundDesc')} action={<Link to="/projects">{t('project.backTo')}</Link>} />;
  if (error || !data)
    return (
      <div className="banner" role="alert">
        {error?.message ?? t('project.loadFail')}
        <Button variant="ghost" onClick={() => refetch()}>{t('common.tryAgain')}</Button>
      </div>
    );
  return <Outlet context={{ project: data.project } satisfies ProjectContext} />;
}
