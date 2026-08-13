export type ReferenceRanges = Record<string, { min: number; max: number }>;

export type RangeStatus = 'high' | 'low' | 'normal';

export interface RangeBounds {
  min: number | null;
  max: number | null;
}

export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  let normalized = String(value).trim().replace(/\s+/g, '');
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getRangeBounds(referenceRanges: ReferenceRanges | null | undefined): RangeBounds | null {
  if (!referenceRanges) return null;
  const groups = Object.values(referenceRanges).filter(
    (g) => g && typeof g === 'object' && (typeof g.min === 'number' || typeof g.max === 'number'),
  );
  if (groups.length === 0) return null;

  const mins = groups
    .map((g) => (typeof g.min === 'number' ? g.min : null))
    .filter((v): v is number => v !== null);
  const maxes = groups
    .map((g) => (typeof g.max === 'number' ? g.max : null))
    .filter((v): v is number => v !== null);

  return {
    min: mins.length > 0 ? Math.min(...mins) : null,
    max: maxes.length > 0 ? Math.max(...maxes) : null,
  };
}

export function getRangeStatus(
  value: string | number | null | undefined,
  referenceRanges: ReferenceRanges | null | undefined,
): RangeStatus | null {
  const numeric = parseDecimal(value);
  if (numeric === null) return null;
  const bounds = getRangeBounds(referenceRanges);
  if (!bounds) return null;
  if (bounds.min !== null && numeric < bounds.min) return 'low';
  if (bounds.max !== null && numeric > bounds.max) return 'high';
  return 'normal';
}

export function formatReferenceRange(referenceRanges: ReferenceRanges | null | undefined): string {
  const bounds = getRangeBounds(referenceRanges);
  if (!bounds) return '—';
  if (bounds.min === null && bounds.max === null) return '—';
  if (bounds.min === null) return `< ${formatValue(bounds.max as number)}`;
  if (bounds.max === null) return `> ${formatValue(bounds.min as number)}`;
  return `${formatValue(bounds.min)} – ${formatValue(bounds.max)}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}
