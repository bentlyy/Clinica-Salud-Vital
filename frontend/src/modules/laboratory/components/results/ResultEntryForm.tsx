import { useState, useEffect, useRef } from 'react';
import type { LabRequestItem, LabTest, LabResultHistory } from '../../types';
import { getItemHistory } from '../../api/laboratory.api';
import ResultCriticalAlert from './ResultCriticalAlert';
import ResultDeltaCheck from './ResultDeltaCheck';

interface ResultEntryFormProps {
  item: LabRequestItem;
  test?: LabTest;
  onSave: (itemId: number, value: string, notes?: string) => Promise<void>;
  onValidateTech?: (itemId: number) => void;
  onValidateDoctor?: (itemId: number) => void;
  onSign?: (itemId: number) => void;
  readOnly?: boolean;
}

export default function ResultEntryForm({
  item, test, onSave, onValidateTech, onValidateDoctor, onSign, readOnly = false,
}: ResultEntryFormProps) {
  const [value, setValue] = useState(item.result_value || '');
  const [notes, setNotes] = useState(item.result_notes || '');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<LabResultHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChanges = value !== (item.result_value || '') || notes !== (item.result_notes || '');

  useEffect(() => {
    if (inputRef.current && !item.result_value) {
      inputRef.current.focus();
    }
  }, [item.result_value]);

  useEffect(() => {
    if (showHistory) {
      getItemHistory(item.id).then(setHistory).catch(() => {});
    }
  }, [showHistory, item.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, value, notes || undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (hasChanges) handleSave();
    }
  };

  const isOutOfRange = test && value && !isNaN(Number(value)) && (
    (test.critical_min !== null && Number(value) < test.critical_min) ||
    (test.critical_max !== null && Number(value) > test.critical_max)
  );

  const isWarningRange = test && value && !isNaN(Number(value)) && !isOutOfRange && (
    (test.reference_min !== null && Number(value) < test.reference_min) ||
    (test.reference_max !== null && Number(value) > test.reference_max)
  );

  const previousResult = history.length > 0 ? history[0] : null;

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 8,
      border: `1px solid ${isOutOfRange ? '#ef4444' : isWarningRange ? '#f59e0b' : 'var(--border-light)'}`,
      background: isOutOfRange ? '#fef2f2' : isWarningRange ? '#fffbeb' : '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 14 }}>{item.test_name || `Test #${item.test_id}`}</strong>
          {item.is_critical && (
            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>
              CRÍTICO
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {item.result_value && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
            >
              {showHistory ? 'Ocultar historial' : '📊 Historial'}
            </button>
          )}
          {!readOnly && item.status === 'result_entered' && onValidateTech && (
            <button onClick={() => onValidateTech(item.id)} className="btn btn-sm" style={{ fontSize: 11, background: '#22c55e20', color: '#16a34a' }}>
              Validar como técnico
            </button>
          )}
          {!readOnly && item.status === 'validated_tech' && onValidateDoctor && (
            <button onClick={() => onValidateDoctor(item.id)} className="btn btn-sm" style={{ fontSize: 11, background: '#3b82f620', color: '#2563eb' }}>
              Validar como médico
            </button>
          )}
          {!readOnly && item.status === 'validated_doctor' && onSign && (
            <button onClick={() => onSign(item.id)} className="btn btn-sm" style={{ fontSize: 11, background: '#8b5cf620', color: '#7c3aed' }}>
              Firmar
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              ref={inputRef}
              className="form-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ingrese resultado"
              disabled={readOnly || !!item.result_value}
              style={{
                fontSize: 14, fontWeight: 600,
                borderColor: isOutOfRange ? '#ef4444' : isWarningRange ? '#f59e0b' : undefined,
              }}
            />
            {test?.unit && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {test.unit}
              </span>
            )}
          </div>
          {test?.reference_min !== null && test?.reference_max !== null && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Ref: {test.reference_min} – {test.reference_max} {test.unit || ''}
              {test.critical_min !== null && test.critical_max !== null && (
                <span style={{ marginLeft: 8, color: '#dc2626' }}>
                  Crítico: {'<'} {test.critical_min} o {'>'} {test.critical_max}
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <input
            className="form-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Notas del resultado"
            disabled={readOnly}
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      {isOutOfRange && (
        <ResultCriticalAlert
          value={value}
          testName={item.test_name || ''}
          min={test?.critical_min}
          max={test?.critical_max}
          unit={test?.unit}
        />
      )}

      {previousResult && value && (
        <ResultDeltaCheck
          currentValue={value}
          previousValue={previousResult.result_value}
          previousDate={previousResult.checked_at}
          deltaPercentage={previousResult.delta_percentage}
          status={previousResult.delta_check_status}
          threshold={test?.delta_check_pct || 20}
        />
      )}

      {showHistory && history.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, background: '#f9fafb', borderRadius: 6, fontSize: 12 }}>
          <strong>Historial del paciente:</strong>
          {history.slice(0, 5).map((h, idx) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
              <span>{new Date(h.checked_at).toLocaleDateString()}</span>
              <span style={{ fontWeight: 600 }}>{h.result_value}</span>
              <span style={{ color: h.delta_check_status === 'critical' ? '#ef4444' : h.delta_check_status === 'warning' ? '#f59e0b' : '#22c55e' }}>
                {h.delta_percentage > 0 ? '+' : ''}{h.delta_percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {!readOnly && hasChanges && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm"
            disabled={saving || !value}
          >
            {saving ? 'Guardando...' : 'Guardar (Ctrl+Enter)'}
          </button>
        </div>
      )}

      {item.validated_at_tech && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Validado por técnico: {new Date(item.validated_at_tech).toLocaleString()}
          {item.validated_at_doctor && ` | Médico: ${new Date(item.validated_at_doctor).toLocaleString()}`}
          {item.signed_at && ` | Firmado: ${new Date(item.signed_at).toLocaleString()}`}
        </div>
      )}
    </div>
  );
}
