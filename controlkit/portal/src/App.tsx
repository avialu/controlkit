import { NavLink, Route, Routes } from 'react-router-dom';
import EnvPicker from './components/EnvPicker';
import ProjectPicker from './components/ProjectPicker';
import { useApp } from './state/AppContext';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/Projects';
import FlagsPage from './pages/Flags';
import ConfigPage from './pages/Config';
import VersionsPage from './pages/Versions';
import AuditLogsPage from './pages/AuditLogs';

export default function App() {
  const { userName, setUserName, error, loading } = useApp();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">ControlKit</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/flags">Feature Flags</NavLink>
          <NavLink to="/config">Remote Config</NavLink>
          <NavLink to="/versions">Versions</NavLink>
          <NavLink to="/audit">Audit Logs</NavLink>
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div className="topbar-group">
            <label className="topbar-label">Project</label>
            <ProjectPicker />
          </div>
          <div className="topbar-group">
            <label className="topbar-label">Environment</label>
            <EnvPicker />
          </div>
          <div className="topbar-group right">
            <label className="topbar-label">User</label>
            <input
              className="user-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              title="Recorded in audit logs"
            />
          </div>
        </header>

        <section className="content">
          {error && <div className="error">{error}</div>}
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/flags" element={<FlagsPage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="/versions" element={<VersionsPage />} />
              <Route path="/audit" element={<AuditLogsPage />} />
            </Routes>
          )}
        </section>
      </main>
    </div>
  );
}
