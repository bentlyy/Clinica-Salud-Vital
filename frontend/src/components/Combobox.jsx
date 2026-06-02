import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

export default function Combobox({ value, onChange, placeholder, required, className }) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    api.get('/specialties').then(res => {
      setOptions(Array.isArray(res) ? res.map(s => s.name) : (res.data || []).map(s => s.name));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setHighlighted(-1);
  }, [value, options]);

  const select = useCallback((val) => {
    onChange(val);
    setOpen(false);
    setHighlighted(-1);
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        e.preventDefault();
        return;
      }
      return;
    }
    const visible = getVisibleOptions();
    if (e.key === 'ArrowDown') {
      setHighlighted(prev => Math.min(prev + 1, visible.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlighted(prev => Math.max(prev - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && highlighted >= 0) {
      select(visible[highlighted]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  const getVisibleOptions = () => {
    if (!value) return options;
    const q = value.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  };

  const handleBlur = (e) => {
    if (!ref.current?.contains(e.relatedTarget)) {
      setOpen(false);
    }
  };

  const visibleOptions = getVisibleOptions();
  const isNew = value && !options.some(o => o.toLowerCase() === value.toLowerCase());

  return (
    <div className={`combobox-wrapper ${className || ''}`} ref={ref} onBlur={handleBlur}>
      <input
        type="text"
        value={value || ''}
        required={required}
        className="form-input combobox-input"
        placeholder={placeholder || 'Escribe o selecciona...'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <button
        type="button"
        className="combobox-toggle"
        onClick={() => setOpen(prev => !prev)}
        tabIndex={-1}
        aria-label="Toggle dropdown"
      >
        ▾
      </button>
      {open && (
        <div className="combobox-dropdown">
          {visibleOptions.length === 0 && !isNew && (
            <div className="combobox-empty">Sin resultados</div>
          )}
          {visibleOptions.map((opt, i) => (
            <div
              key={opt}
              className={`combobox-option ${highlighted === i ? 'highlighted' : ''}`}
              onMouseDown={() => select(opt)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {opt}
            </div>
          ))}
          {isNew && (
            <div
              className={`combobox-option combobox-new ${highlighted === visibleOptions.length ? 'highlighted' : ''}`}
              onMouseDown={() => select(value)}
              onMouseEnter={() => setHighlighted(visibleOptions.length)}
            >
              Agregar "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
