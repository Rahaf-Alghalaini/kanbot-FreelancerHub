import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { GuestRoute } from './features/auth/GuestRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ProjectRoute } from './features/projects/ProjectRoute';
import { BacklogPage } from './features/backlog/BacklogPage';
import { BoardPage } from './features/board/BoardPage';
import { SprintsPage } from './features/sprints/SprintsPage';
import { SprintDetailsPage } from './features/sprints/SprintDetailsPage';

export const router = createBrowserRouter([
  { element: <GuestRoute />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/register', element: <RegisterPage /> }] },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/projects" replace /> },
          { path: '/projects', element: <ProjectsPage />, handle: { titleKey: 'title.projects' } },
          {
            path: '/projects/:projectId',
            element: <ProjectRoute />,
            children: [
              { index: true, element: <Navigate to="board" replace /> },
              { path: 'backlog', element: <BacklogPage />, handle: { titleKey: 'title.backlog' } },
              { path: 'board', element: <BoardPage />, handle: { titleKey: 'title.board' } },
              { path: 'sprints', element: <SprintsPage />, handle: { titleKey: 'title.sprints' } },
              { path: 'sprints/:sprintId', element: <SprintDetailsPage />, handle: { titleKey: 'title.sprintDetails' } },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/projects" replace /> },
]);
