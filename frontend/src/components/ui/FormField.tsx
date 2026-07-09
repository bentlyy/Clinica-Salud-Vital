import { type ReactNode, type InputHTMLAttributes, forwardRef } from 'react';
import './FormField.css';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="ds-field">
      <label className="ds-field__label">
        {label}
        {required && <span className="ds-field__required">*</span>}
      </label>
      {children}
      {error && <span className="ds-field__error">{error}</span>}
      {hint && !error && <span className="ds-field__hint">{hint}</span>}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, required, className = '', ...props }, ref) => {
    return (
      <FormField label={label} error={error} hint={hint} required={required}>
        <input
          ref={ref}
          className={`ds-input${error ? ' ds-input--error' : ''} ${className}`}
          {...props}
        />
      </FormField>
    );
  }
);
TextField.displayName = 'TextField';

interface SelectFieldProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, required, options, placeholder, className = '', ...props }, ref) => {
    return (
      <FormField label={label} error={error} hint={hint} required={required}>
        <select
          ref={ref}
          className={`ds-input ds-select${error ? ' ds-input--error' : ''} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </FormField>
    );
  }
);
SelectField.displayName = 'SelectField';
