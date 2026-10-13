import winston from 'winston';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// ─── Redacción de datos sensibles en logs ───────────────────────────────────
// Evita que tokens/secretos acaben en los archivos de log y neutraliza la
// inyección de líneas de log (CRLF) proveniente de valores de usuario.
const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const AUTH_HEADER_RE = /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const SECRET_PAIR_RE = /("?(?:password|current_password|new_password|totp_secret|totp_token|access_token|refresh_token|invite_token|api[_-]?key|secret|token)"?\s*[:=]\s*)"?[^",\s}]+"?/gi;

const redactString = (value: string): string =>
  value
    .replace(JWT_RE, '[REDACTED_JWT]')
    .replace(AUTH_HEADER_RE, '[REDACTED_AUTH]')
    .replace(SECRET_PAIR_RE, '$1"[REDACTED]"')
    .replace(/[\r\n]+/g, '\\n');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null &&
  (value.constructor === Object || Object.getPrototypeOf(value) === null);

const redactDeep = (value: unknown): unknown => {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = redactDeep(val);
    return out;
  }
  return value;
};

export { redactString, redactDeep };

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === 'level') continue;
    const value = (info as Record<string, unknown>)[key];
    if (typeof value === 'string') {
      (info as Record<string, unknown>)[key] = redactString(value);
    } else if (value && typeof value === 'object') {
      (info as Record<string, unknown>)[key] = redactDeep(value);
    }
  }
  return info;
});

const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
});

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  redactFormat(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = isProduction ? jsonFormat : winston.format.combine(redactFormat(), winston.format.colorize(), logFormat);

const logDir = process.env.LOG_DIR || 'logs';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: resolve(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: resolve(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});