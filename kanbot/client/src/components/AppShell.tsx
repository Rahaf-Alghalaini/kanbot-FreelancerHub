import { useState } from 'react';
import { Outlet, useMatch, useMatches } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AskAiDrawer } from '../features/ai/AskAiDrawer';
import { useProjectQuery } from '../hooks/useProjects';
import { t, type Key } from '../i18n';

type RouteHandle = { titleKey?: Key };

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const titleKey = [...useMatches()].reverse().map((m) => (m.handle as RouteHandle | undefined)?.titleKey).find(Boolean);
  const title = titleKey ? t(titleKey) : 'Kanbot';
  const projectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const project = useProjectQuery(projectId).data?.project;

  return (
    <div className="shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="content">
        <Header title={title} subtitle={project ? `${project.key} · ${project.name}` : undefined} onMenu={() => setMenuOpen(true)} onAskAi={() => setAiOpen(true)} />
        <div id="content-scroll" className="content-scroll">
          <Outlet />
        </div>
      </main>
      <AskAiDrawer open={aiOpen} projectId={projectId} onClose={() => setAiOpen(false)} />
    </div>
  );
}
