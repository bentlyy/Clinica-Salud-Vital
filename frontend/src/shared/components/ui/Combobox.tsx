import {
  Box,
  TextField,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
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
  const [options, setOptions] = useState<string[]>(staticOptions || []);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    setHighlighted(-1);
  }, [value, options]);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      setHighlighted(-1);
    },
    [onChange],
  );

  const getVisibleOptions = (): string[] => {
    if (!value) return options;
    const q = value.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  };

  const visibleOptions = getVisibleOptions();
  const isNew = value && !options.some((o) => o.toLowerCase() === value.toLowerCase());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlighted((prev) => Math.min(prev + 1, visibleOptions.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlighted((prev) => Math.max(prev - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && highlighted >= 0 && visibleOptions[highlighted] !== undefined) {
      select(visibleOptions[highlighted]!);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  return (
    <Box ref={ref} onBlur={handleBlur} sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        label={label}
        required={required}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t('comboboxPlaceholder', 'Escribe o selecciona...')}
        disabled={disabled}
        error={error}
        helperText={helperText}
        autoComplete="off"
        inputRef={inputRef}
        slotProps={{
          input: {
            endAdornment: loading ? (
              <CircularProgress size={18} sx={{ color: theme.palette.text.secondary }} />
            ) : (
              <ArrowDropDown sx={{ color: theme.palette.text.secondary, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            ),
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
          },
        }}
      />

      {open && visibleOptions.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            maxHeight: 240,
            overflow: 'auto',
            zIndex: 1300,
            borderRadius: '10px',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {visibleOptions.map((opt, i) => (
            <Box
              key={opt}
              onMouseDown={() => select(opt)}
              onMouseEnter={() => setHighlighted(i)}
              sx={{
                px: 2,
                py: 1,
                cursor: 'pointer',
                fontSize: 14,
                backgroundColor: highlighted === i ? (theme.palette.custom?.brand?.lightest || theme.palette.action.hover) : 'transparent',
                color: highlighted === i ? theme.palette.primary.main : theme.palette.text.primary,
                '&:hover': { backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.hover },
              }}
            >
              {opt}
            </Box>
          ))}
        </Paper>
      )}

      {open && visibleOptions.length === 0 && !isNew && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            zIndex: 1300,
            borderRadius: '10px',
            border: `1px solid ${theme.palette.divider}`,
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {t('noOptions', 'Sin resultados')}
          </Typography>
        </Paper>
      )}

      {open && isNew && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            zIndex: 1300,
            borderRadius: '10px',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            onMouseDown={() => select(value)}
            sx={{
              px: 2,
              py: 1,
              cursor: 'pointer',
              fontSize: 14,
              color: theme.palette.primary.main,
              fontWeight: 500,
              '&:hover': { backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.hover },
            }}
          >
            {t('addOption', 'Agregar "{{value}}"', { value })}
          </Box>
        </Paper>
      )}
    </Box>
  );
});
