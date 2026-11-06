import { Link, NavLink, useMatch } from 'react-router-dom';
import { FolderKanban, LayoutDashboard, ListTodo, LogOut, Timer, X } from 'lucide-react';
import { t } from '../i18n';
import { useAuth } from '../features/auth/AuthContext';
import { ProjectSwitcher } from '../features/projects/ProjectSwitcher';
import logo from '../assets/kanbot-icon.svg';
import { Preferences } from './Preferences';

const SECTIONS = [
  { path: 'backlog', label: 'nav.backlog', icon: ListTodo, tint: 'blue' },
  { path: 'board', label: 'nav.board', icon: LayoutDashboard, tint: 'violet' },
  { path: 'sprints', label: 'nav.sprints', icon: Timer, tint: 'green' },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const projectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const cls = ({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`;

  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <Link to="/projects" onClick={onClose} className="brand-link"><img src={logo} alt="" width={36} height={36} /><span>Kanbot</span></Link>
          <button className="icon-btn close-btn" onClick={onClose} aria-label={t('nav.closeMenu')}><X size={18} /></button>
        </div>

        <ProjectSwitcher onNavigate={onClose} />

        <nav aria-label={t('nav.main')}>
          <NavLink to="/projects" end onClick={onClose} className={cls}>
            <span className="nav-icon tint-amber"><FolderKanban size={17} /></span>{t('nav.projects')}
          </NavLink>
          {SECTIONS.map(({ path, label, icon: Icon, tint }) =>
            projectId ? (
              <NavLink key={path} to={`/projects/${projectId}/${path}`} onClick={onClose} className={cls}>
                <span className={`nav-icon tint-${tint}`}><Icon size={17} /></span>{t(label)}
              </NavLink>
            ) : (
              <span key={path} className="nav-item disabled" aria-disabled="true" title={t('nav.selectFirst')}>
                <span className={`nav-icon tint-${tint}`}><Icon size={17} /></span>{t(label)}
              </span>
            ),
          )}
        </nav>

        <div className="sidebar-foot">
          <Preferences />
          <div className="user">
            <span className="avatar">{user?.name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{user?.name}</strong><small>{user?.email}</small></div>
          </div>
          <button className="logout-btn" onClick={logout}><LogOut size={16} /> {t('nav.logout')}</button>
        </div>
      </aside>
    </>
  );
}
