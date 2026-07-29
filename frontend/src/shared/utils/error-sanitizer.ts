import i18n from '../../i18n/i18n.js';

const FALLBACK_ERROR_KEY = 'error_sanitizer.fallback';
const SERVER_ERROR_KEY = 'error_sanitizer.serverError';

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
  if (!err) return i18n.t(FALLBACK_ERROR_KEY);

  const apiErr = err as { response?: { data?: ApiErrorBody } };
  const apiMessage = apiErr.response?.data?.error;
  if (apiMessage && typeof apiMessage === 'string' && apiMessage.length <= 200) {
    return apiMessage;
  }
  if (apiMessage && typeof apiMessage === 'object') {
    return i18n.t(FALLBACK_ERROR_KEY);
  }

  const message = String((err as Error).message ?? err);

  if (isSensitiveError(message)) return i18n.t(SERVER_ERROR_KEY);

  return message;
}
