import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SxProps } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  sx?: SxProps;
}

export const SearchInput = memo(function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  debounceMs = 350,
  sx,
}: SearchInputProps) {
  const theme = useTheme();
  const { t } = useTranslation('lab');
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when external value changes (e.g. filter reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (inputValue: string) => {
      setLocalValue(inputValue);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        onChange(inputValue);
      }, debounceMs);
    },
    [onChange, debounceMs],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, [onChange]);

  return (
    <TextField
      size="small"
      variant="outlined"
      fullWidth
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
            </InputAdornment>
          ),
          endAdornment: localValue ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                aria-label={t('clear')}
                sx={{ color: theme.palette.text.secondary, p: 0.25 }}
              >
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
      sx={{
        minWidth: 220,
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          fontSize: '0.875rem',
          backgroundColor: theme.palette.background.paper,
          '& fieldset': { borderColor: theme.palette.divider },
          '&:hover fieldset': { borderColor: theme.palette.text.secondary },
          '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: 2 },
        },
        ...sx,
      }}
    />
  );
});
