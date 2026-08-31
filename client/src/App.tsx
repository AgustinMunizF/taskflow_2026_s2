import { Navigate, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import BoardPage from './pages/BoardPage';
import TaskDetailPage from './pages/TaskDetailPage';
import MembersPage from './pages/MembersPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function Header() {
  const { user, token, logout } = useAuth();
  if (!token) return null;
  return (
    <header className="header" data-testid="app-header">
      <Link to="/projects" className="header-brand" data-testid="header-home-link">
        TaskFlow
      </Link>
      <div className="header-user">
        <span data-testid="header-user-email">{user?.email}</span>
        <button type="button" data-testid="logout-button" onClick={logout}>
          Salir
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/projects"
            element={
              <RequireAuth>
                <ProjectsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <RequireAuth>
                <BoardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:projectId/members"
            element={
              <RequireAuth>
                <MembersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:projectId/tasks/:taskId"
            element={
              <RequireAuth>
                <TaskDetailPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>
    </div>
  );
}
