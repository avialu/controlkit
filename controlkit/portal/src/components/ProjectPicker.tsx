import { useApp } from '../state/AppContext';

export default function ProjectPicker() {
  const { projects, selectedProjectId, setSelectedProjectId } = useApp();

  if (projects.length === 0) {
    return <span className="muted">No projects</span>;
  }
  return (
    <select
      value={selectedProjectId ?? ''}
      onChange={(e) => setSelectedProjectId(e.target.value)}
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}
