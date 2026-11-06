import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useProjectsQuery } from '../../hooks/useProjects';
import { t } from '../../i18n';

/** Native select: accessible and keyboard friendly. Keeps the current section (backlog/board/sprints) when switching. */
export function ProjectSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const projectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const section = /\/(backlog|board|sprints)$/.exec(pathname)?.[1] ?? 'board';
  const { data, isLoading } = useProjectsQuery();
  const projects = data?.projects ?? [];
  const value = projects.some((p) => p.id === projectId) ? projectId : '';

  return (
    <label className="switcher">
      <small>{t('nav.project')}</small>
      <select
        value={value}
        disabled={isLoading}
        onChange={(e) => {
          nav(e.target.value ? `/projects/${e.target.value}/${section}` : '/projects');
          onNavigate?.();
        }}
      >
        <option value="">{projects.length ? t('nav.selectProject') : t('nav.noProjects')}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.key} · {p.name}</option>
        ))}
      </select>
    </label>
  );
}
