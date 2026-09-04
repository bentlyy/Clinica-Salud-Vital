import { TextField, Autocomplete, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useId, memo } from 'react';
import { apiClient } from '@/shared/services/api-client';

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
  fetchUrl?: string;
  options?: string[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export const Combobox = memo(function Combobox({
  value,
  onChange,
  placeholder,
  required,
  label,
  fetchUrl,
  options: staticOptions,
  disabled = false,
  error = false,
  helperText,
}: ComboboxProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const id = useId();
  const [options, setOptions] = useState<string[]>(staticOptions || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staticOptions && staticOptions.length > 0) {
      setOptions(staticOptions);
      return;
    }
    if (!fetchUrl) return;

    let cancelled = false;
    setLoading(true);
    apiClient
      .get(fetchUrl)
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setOptions(data.map((s: { name?: string; label?: string }) => s.name || s.label || String(s)));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchUrl, staticOptions]);

  const filterOptions = (fullOptions: string[], state: { inputValue: string }) => {
    const q = state.inputValue.toLowerCase();
    const filtered = fullOptions.filter((o) => o.toLowerCase().includes(q));
    const trimmed = state.inputValue.trim();
    if (trimmed && !fullOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      filtered.push(`__create__${trimmed}`);
    }
    return filtered;
  };

  return (
    <Autocomplete
      id={id}
      fullWidth
      openOnFocus
      value={value}
      onChange={(_, newVal) => {
        if (typeof newVal === 'string' && newVal.startsWith('__create__')) {
          onChange(newVal.slice('__create__'.length));
        } else {
          onChange(typeof newVal === 'string' ? newVal : '');
        }
      }}
      onInputChange={(_, val) => onChange(val)}
      options={options}
      loading={loading}
      noOptionsText={t('noOptions', 'Sin resultados')}
      filterOptions={filterOptions}
      disabled={disabled}
      getOptionLabel={(option) => (typeof option === 'string' && option.startsWith('__create__') ? option.slice('__create__'.length) : option)}
      renderOption={(props, option) => {
        const isCreate = typeof option === 'string' && option.startsWith('__create__');
        const label = isCreate ? t('addOption', 'Agregar "{{value}}"', { value: option.slice('__create__'.length) }) : option;
        return (
          <li {...props} key={option}>
            {label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder ?? t('comboboxPlaceholder', 'Escribe o selecciona...')}
          error={error}
          helperText={helperText}
          autoComplete="off"
          InputProps={{
            ...params.InputProps,
            endAdornment: loading ? (
              <CircularProgress size={18} sx={{ color: theme.palette.text.secondary }} />
            ) : (
              params.InputProps.endAdornment
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
            },
          }}
        />
      )}
    />
  );
});
