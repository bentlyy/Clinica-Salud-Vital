import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import api from '../api/axios';

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

function Combobox({ value, onChange, placeholder, required, className }: ComboboxProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/specialties').then(res => {
      if (cancelled) return;
      const data = Array.isArray(res) ? res : (res.data || []);
      setOptions(data.map(s => s.name));
    }).catch(() => {
      if (!cancelled) setOptions([]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setHighlighted(-1);
  }, [value, options]);

  const select = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setHighlighted(-1);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const getVisibleOptions = (): string[] => {
    if (!value) return options;
    const q = value.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
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
              Agregar &quot;{value}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(Combobox);
