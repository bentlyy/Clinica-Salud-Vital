export default function LoadingState({ message = 'Cargando...', fullPage = false }) {
  return (
    <div className={`loading-state${fullPage ? ' loading-state-full' : ''}`}>
      <div className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
}
