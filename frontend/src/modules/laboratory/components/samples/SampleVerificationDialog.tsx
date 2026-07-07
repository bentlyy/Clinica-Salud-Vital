import { useState } from 'react';
import type { LabSample } from '../../types';

interface SampleVerificationDialogProps {
  sample: LabSample;
  onVerify: () => void;
  onClose: () => void;
}

export default function SampleVerificationDialog({ sample, onVerify, onClose }: SampleVerificationDialogProps) {
  const [verified, setVerified] = useState(false);
  const [notes, setNotes] = useState('');

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>✅ Verificar Muestra</h3>
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>
        Código: <strong>{sample.sample_code || `#${sample.id}`}</strong><br />
        Tipo: <strong>{sample.sample_type}</strong><br />
        Volumen: <strong>{sample.volume ? `${sample.volume} ml` : '—'}</strong>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        <span style={{ fontSize: 13 }}>
          Confirmo que la muestra cumple con los criterios de calidad
        </span>
      </label>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Notas de verificación</label>
        <textarea
          className="form-input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Incidencias, observaciones..."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button onClick={onVerify} className="btn btn-primary" disabled={!verified}>
          Confirmar verificación
        </button>
      </div>
    </div>
  );
}
