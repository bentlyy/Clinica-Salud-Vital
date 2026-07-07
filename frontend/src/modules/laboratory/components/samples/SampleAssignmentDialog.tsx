import { useState } from 'react';
import type { LabSample } from '../../types';

interface SampleAssignmentDialogProps {
  sample: LabSample;
  onAssign: (data: { assigned_tech_id: number; assigned_equipment_id?: number }) => void;
  onClose: () => void;
}

export default function SampleAssignmentDialog({ sample, onAssign, onClose }: SampleAssignmentDialogProps) {
  const [techId, setTechId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');

  const handleSubmit = () => {
    if (!techId) return;
    onAssign({
      assigned_tech_id: Number(techId),
      assigned_equipment_id: equipmentId ? Number(equipmentId) : undefined,
    });
  };

  return (
    <div style={{ padding: '16px 20px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>👤 Asignar Muestra</h3>
      <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>
        Muestra: <strong>{sample.sample_code || `#${sample.id}`}</strong>
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Tecnólogo *</label>
        <input
          className="form-input"
          type="number"
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
          placeholder="ID del tecnólogo"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Equipo</label>
        <input
          className="form-input"
          type="number"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          placeholder="ID del equipo (opcional)"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
        <button onClick={handleSubmit} className="btn btn-primary" disabled={!techId}>
          Asignar
        </button>
      </div>
    </div>
  );
}
