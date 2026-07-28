const FALLBACK_ERROR = 'Ocurrió un error inesperado';
const SERVER_ERROR = 'Error interno del servidor';

const SQL_PATTERNS = [
  /SELECT\s+\*/i,
  /INSERT\s+INTO\s+/i,
  /DROP\s+(TABLE|DATABASE|INDEX|VIEW)\s+/i,
  /UNION\s+(ALL\s+)?SELECT\s+/i,
  /\bOR\s+1\s*=\s*1\b/i,
  /\bAND\s+1\s*=\s*1\b/i,
  /;\s*('|--)/,
  /WAITFOR\s+DELAY\s+/i,
];

function isSensitiveError(message: string): boolean {
  if (message.includes('node_modules')) return true;
  if (/[A-Z]:\\/i.test(message) || message.includes('/app/')) return true;
  return SQL_PATTERNS.some((pattern) => pattern.test(message));
}

export interface ApiErrorBody {
  error?: string;
  code?: string;
}

export function getErrorCode(err: unknown): string | undefined {
  const apiErr = err as { response?: { data?: ApiErrorBody } };
  return apiErr.response?.data?.code;
}

export function sanitizeError(err: unknown): string {
  if (!err) return FALLBACK_ERROR;

  const apiErr = err as { response?: { data?: ApiErrorBody } };
  const apiMessage = apiErr.response?.data?.error;
  if (apiMessage && typeof apiMessage === 'string' && apiMessage.length <= 200) {
    return apiMessage;
  }
  if (apiMessage && typeof apiMessage === 'object') {
    return FALLBACK_ERROR;
  }

  const message = String((err as Error).message ?? err);

  if (isSensitiveError(message)) return SERVER_ERROR;

  return message;
}
