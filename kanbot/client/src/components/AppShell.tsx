import { useState } from 'react';
import { Outlet, useMatch, useMatches } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AskAiDrawer } from '../features/ai/AskAiDrawer';
import { ChatProvider, useChat } from '../features/ai/ChatContext';
import { useProjectQuery } from '../hooks/useProjects';
import { t, type Key } from '../i18n';

type RouteHandle = { titleKey?: Key };

/** The chat state lives in ChatProvider so any page can open the chat with a ready-made message. */
export function AppShell() {
  return (
    <ChatProvider>
      <Shell />
    </ChatProvider>
  );
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: aiOpen, openChat, closeChat } = useChat();

  const titleKey = [...useMatches()].reverse().map((m) => (m.handle as RouteHandle | undefined)?.titleKey).find(Boolean);
  const title = titleKey ? t(titleKey) : 'Kanbot';
  const projectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const project = useProjectQuery(projectId).data?.project;

  return (
    <div className="shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="content">
        <Header title={title} subtitle={project ? `${project.key} · ${project.name}` : undefined} onMenu={() => setMenuOpen(true)} onAskAi={openChat} />
        <div id="content-scroll" className="content-scroll">
          <Outlet />
        </div>
      </main>
      <AskAiDrawer open={aiOpen} projectId={projectId} onClose={closeChat} />
    </div>
  );
}
