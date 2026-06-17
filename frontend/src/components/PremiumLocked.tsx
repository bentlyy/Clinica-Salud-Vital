import { useNavigate } from 'react-router-dom';

export default function PremiumLocked({ featureName = 'Laboratorio' }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      textAlign: 'center',
      padding: 40,
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'var(--bg-tertiary, #f0f0f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        marginBottom: 24,
        opacity: 0.6,
      }}>
        🔒
      </div>
      <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>
        {featureName} — Función Premium
      </h2>
      <p style={{
        color: 'var(--text-secondary)',
        maxWidth: 440,
        margin: '0 0 24px',
        lineHeight: 1.6,
      }}>
        Esta funcionalidad no está disponible en tu plan actual.
        Actualiza a un plan superior para acceder a órdenes de laboratorio,
        resultados de exámenes y más.
      </p>
      <button
        onClick={() => navigate('/saas/plans')}
        className="btn btn-primary"
        style={{ padding: '12px 32px', fontSize: 16 }}
      >
        Ver Planes Disponibles
      </button>
    </div>
  );
}
