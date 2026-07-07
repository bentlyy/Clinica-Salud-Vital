export function extractList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'data' in response) {
    const d = (response as Record<string, unknown>).data;
    if (Array.isArray(d)) return d as T[];
  }
  return [];
}
