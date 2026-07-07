import { useState } from 'react';
import type { LabSample } from '../../types';

interface SampleQCDialogProps {
  sample: LabSample;
  onRecordQC: (data: { qc_status: string; qc_notes?: string }) => void;
  onClose: () => void;
}

const QC_OPTIONS = [
  { value: 'passed', label: '✅ Aprobado', color: '#22c55e' },
  { value: 'warning', label: '⚠️ Advertencia', color: '#f59e0b' },
  { value: 'failed', label: '❌ Fallido', color: '#ef4444' },
];

export default function SampleQCDialog({ sample, onRecordQC, onClose }: SampleQCDialogProps) {
  const [qcStatus, setQcStatus] = useState('passed');
  const [qcNotes, setQcNotes] = useState('');

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔬 Control de Calidad</h3>
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>
        Muestra: <strong>{sample.sample_code || `#${sample.id}`}</strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {QC_OPTIONS.map((opt) => (
          <label key={opt.value} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${qcStatus === opt.value ? opt.color : 'var(--border-light)'}`,
            background: qcStatus === opt.value ? `${opt.color}10` : '#fff',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <input
              type="radio"
              name="qc-status"
              value={opt.value}
              checked={qcStatus === opt.value}
              onChange={(e) => setQcStatus(e.target.value)}
              style={{ accentColor: opt.color }}
            />
            <span style={{ fontSize: 13, fontWeight: qcStatus === opt.value ? 600 : 400 }}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Notas de QC</label>
        <textarea
          className="form-input"
          rows={2}
          value={qcNotes}
          onChange={(e) => setQcNotes(e.target.value)}
          placeholder="Resultados de controles, observaciones..."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button
          onClick={() => onRecordQC({ qc_status: qcStatus, qc_notes: qcNotes || undefined })}
          className="btn btn-primary"
        >
          Registrar QC
        </button>
      </div>
    </div>
  );
}
