import crypto from 'crypto';

// SSO: al retirar el auth local (login/2FA/reset) se dejaron de usar el cifrado
// de secretos TOTP (encrypt/decrypt) y hashToken. Queda solo la integridad de la
// auditoría, que sigue consumida por audit.service y audit-integrity.job.

export function getAuditHmacSecret(): string {
  const secret = process.env.AUDIT_HMAC_SECRET;
  if (!secret) {
    throw new Error('AUDIT_HMAC_SECRET environment variable is required for audit log integrity');
  }
  if (secret.length < 32) {
    throw new Error('AUDIT_HMAC_SECRET must be at least 32 characters');
  }
  return secret;
}

export function computeHmac(data: string): string {
  return crypto.createHmac('sha256', getAuditHmacSecret()).update(data).digest('hex');
}
