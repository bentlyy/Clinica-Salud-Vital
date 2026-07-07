import { useState } from 'react';
import type { LabRequest, LabSample } from '../../types';
import { createSample } from '../../api/laboratory.api';

interface SampleReceptionPanelProps {
  request: LabRequest;
  onReceived: (sample: LabSample) => void;
  onClose: () => void;
}

export default function SampleReceptionPanel({ request, onReceived, onClose }: SampleReceptionPanelProps) {
  const [sampleType, setSampleType] = useState('blood');
  const [containerType, setContainerType] = useState('tube');
  const [volume, setVolume] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const sample = await createSample({
        lab_request_id: request.id,
        sample_type: sampleType,
        container_type: containerType,
        volume: volume ? Number(volume) : null,
        notes: notes || null,
      });
      onReceived(sample);
    } catch { /* error handled upstream */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        📥 Recepción de Muestra
      </h3>

      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>
        Orden: <strong>{request.request_number || `#${request.id}`}</strong>
        <br />
        Paciente: <strong>{request.patient_name}</strong>
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Tipo de muestra</label>
        <select
          className="form-input"
          value={sampleType}
          onChange={(e) => setSampleType(e.target.value)}
        >
          <option value="blood">Sangre</option>
          <option value="urine">Orina</option>
          <option value="feces">Heces</option>
          <option value="sputum">Esputo</option>
          <option value="swab">Hispado</option>
          <option value="csf">Líquido cefalorraquídeo</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Tipo de contenedor</label>
        <select
          className="form-input"
          value={containerType}
          onChange={(e) => setContainerType(e.target.value)}
        >
          <option value="tube">Tubo</option>
          <option value="flask">Frasco</option>
          <option value="jar">Pote</option>
          <option value="swab">Hispado</option>
          <option value="slide">Portaobjetos</option>
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Volumen (ml)</label>
        <input
          className="form-input"
          type="number"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder="Ej: 5.0"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Observaciones</label>
        <textarea
          className="form-input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Estado de la muestra, condiciones especiales..."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} className="btn btn-ghost" disabled={saving}>
          Cancelar
        </button>
        <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
          {saving ? 'Registrando...' : 'Registrar recepción'}
        </button>
      </div>
    </div>
  );
}
