import type { LabRequestItem } from '../../types';
import { LAB_STATUS_LABELS } from '../../types';
import LabStatusBadge from '../shared/LabStatusBadge';

interface ValidationWorklistProps {
  items: LabRequestItem[];
  onValidateTech: (itemId: number) => void;
  onValidateDoctor: (itemId: number) => void;
  onSign: (itemId: number) => void;
  loading?: boolean;
}

export default function ValidationWorklist({
  items, onValidateTech, onValidateDoctor, onSign, loading,
}: ValidationWorklistProps) {
  const techPending = items.filter(i => i.status === 'result_entered');
  const doctorPending = items.filter(i => i.status === 'validated_tech');
  const signPending = items.filter(i => i.status === 'validated_doctor');

  return (
    <div>
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>Sin pendientes de validación</h3>
          <p>Todos los resultados han sido validados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {techPending.length > 0 && (
            <Section title="Validación Técnico" color="#22c55e" count={techPending.length}>
              {techPending.map(item => (
                <ValidationRow key={item.id} item={item} onAction={() => onValidateTech(item.id)} actionLabel="Validar" actionColor="#22c55e" />
              ))}
            </Section>
          )}

          {doctorPending.length > 0 && (
            <Section title="Validación Médico" color="#3b82f6" count={doctorPending.length}>
              {doctorPending.map(item => (
                <ValidationRow key={item.id} item={item} onAction={() => onValidateDoctor(item.id)} actionLabel="Validar" actionColor="#3b82f6" />
              ))}
            </Section>
          )}

          {signPending.length > 0 && (
            <Section title="Firma Digital" color="#8b5cf6" count={signPending.length}>
              {signPending.map(item => (
                <ValidationRow key={item.id} item={item} onAction={() => onSign(item.id)} actionLabel="Firmar" actionColor="#8b5cf6" />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, color, count, children }: { title: string; color: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <strong style={{ fontSize: 14, color }}>{title}</strong>
        <span style={{
          fontSize: 12, fontWeight: 700, color: '#fff', background: color,
          padding: '1px 8px', borderRadius: 10,
        }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function ValidationRow({ item, onAction, actionLabel, actionColor }: {
  item: LabRequestItem;
  onAction: () => void;
  actionLabel: string;
  actionColor: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 8,
      border: '1px solid var(--border-light)',
      background: '#fff',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong style={{ fontSize: 13 }}>{item.test_name}</strong>
          <LabStatusBadge status={item.status} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          Resultado: <strong>{item.result_value || '—'}</strong>
          {item.unit && <span> {item.unit}</span>}
        </div>
      </div>
      <button
        onClick={onAction}
        className="btn btn-sm"
        style={{ background: `${actionColor}15`, color: actionColor, fontWeight: 600, fontSize: 12 }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
