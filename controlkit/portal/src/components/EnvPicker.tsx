import { useApp } from '../state/AppContext';

export default function EnvPicker() {
  const { environment, setEnvironment } = useApp();
  return (
    <div className="env-picker">
      <button
        className={environment === 'production' ? 'active' : ''}
        onClick={() => setEnvironment('production')}
      >
        production
      </button>
      <button
        className={environment === 'staging' ? 'active' : ''}
        onClick={() => setEnvironment('staging')}
      >
        staging
      </button>
    </div>
  );
}
