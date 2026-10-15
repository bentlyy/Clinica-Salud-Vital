import { logger } from '../utils/logger.js';
import { toError } from '../utils/errors.js';

// Clave TEST oficial de Google: siteverify siempre responde success=true.
const RECAPTCHA_TEST_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Verifica un token de reCAPTCHA contra la API de Google.
 *
 * Fail-closed en producción (FND-S5/FND-F1): sin `RECAPTCHA_SECRET_KEY`, con la
 * TEST key o sin token ⇒ rechaza. En desarrollo, si no hay secret configurado se
 * permite seguir sin captcha (dejando aviso en logs) para no bloquear el entorno.
 */
export const verifyRecaptcha = async (token: string, context: string): Promise<boolean> => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    if (isProduction()) {
      logger.error(`reCAPTCHA: RECAPTCHA_SECRET_KEY ausente en producción — rechazando ${context}`);
      return false;
    }
    logger.warn(`reCAPTCHA deshabilitado (sin RECAPTCHA_SECRET_KEY) — ${context} sin captcha en desarrollo`);
    return true;
  }

  if (secret === RECAPTCHA_TEST_KEY) {
    if (isProduction()) {
      logger.error(`reCAPTCHA: TEST key de Google en producción — rechazando ${context}`);
      return false;
    }
    logger.warn(`reCAPTCHA: TEST key de Google en uso — ${context} aceptado siempre (modo prueba)`);
    return true;
  }

  if (!token) {
    logger.warn(`reCAPTCHA: secret configurado pero sin token — rechazando ${context}`);
    return false;
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { success: boolean; 'error-codes'?: string[]; hostname?: string };
    logger.info('reCAPTCHA verification result', {
      context,
      success: data.success,
      errorCodes: data['error-codes'],
      hostname: data.hostname,
    });
    return data.success === true;
  } catch (err) {
    logger.error('reCAPTCHA verification error (network/timeout)', { context, error: toError(err).message });
    return false;
  }
};
