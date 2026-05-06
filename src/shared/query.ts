export const getQuery = (query: Record<string, unknown>, key: string): string | undefined => {
  const val = query[key];
  return val ? String(val) : undefined;
};

export const getQueryInt = (query: Record<string, unknown>, key: string, def?: number): number => {
  const val = query[key];
  if (!val) return def ?? 0;
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? (def ?? 0) : parsed;
};

export const getQueryString = (query: Record<string, unknown>, key: string, def?: string): string => {
  const val = query[key];
  return val ? String(val) : (def ?? '');
};

export const asStringArray = (val: unknown): string[] => {
  if (Array.isArray(val)) return val.map(String);
  if (val) return [String(val)];
  return [];
};