export default function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-sm" style={{ background: 'var(--danger-500)', color: '#fff', border: 'none', flexShrink: 0 }}>
          Reintentar
        </button>
      )}
    </div>
  );
}
