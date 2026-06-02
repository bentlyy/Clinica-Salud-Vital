import sanitizeHtml from 'sanitize-html';

const STRIP_ALL_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: [],
  disallowedTagsMode: 'discard',
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: [],
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
};

export const sanitizeText = (input: string | undefined | null): string | undefined => {
  if (input == null) return undefined;
  const stripped = sanitizeHtml(input, STRIP_ALL_OPTIONS);
  return stripped.trim();
};

export const sanitizeTextStrict = (input: string | undefined | null, maxLength = 10000): string | undefined => {
  if (input == null) return undefined;
  const stripped = sanitizeHtml(input, STRIP_ALL_OPTIONS);
  return stripped.trim().substring(0, maxLength);
};

export const sanitizeRecordFields = <T extends Record<string, unknown>>(data: T, textFields: (keyof T)[]): T => {
  const sanitized = { ...data };
  for (const field of textFields) {
    const value = sanitized[field];
    if (typeof value === 'string') {
      sanitized[field] = sanitizeText(value) as T[keyof T];
    }
  }
  return sanitized;
};

const SENSITIVE_FIELDS = ['password', 'current_password', 'new_password', 'totp_secret', 'totp_token', 'token', 'access_token', 'refresh_token', 'secret', 'captcha_token'];

export const stripSensitiveFields = (body: Record<string, unknown>): Record<string, unknown> => {
  if (!body || typeof body !== 'object') return body;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      clean[key] = stripSensitiveFields(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};
