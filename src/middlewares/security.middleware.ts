import helmet from 'helmet';
import hpp from 'hpp';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { UnauthorizedError } from '../utils/errors.js';

const isProduction = process.env.NODE_ENV === 'production';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
        frameSrc: ["'self'", "https://www.google.com/recaptcha/"],
        workerSrc: ["'self'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: { policy: 'credentialless' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: true,
    frameguard: {
      action: 'deny',
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    originAgentCluster: true,
  }),
  hpp(),
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), display-capture=(), clipboard-read=(), clipboard-write=(self)');
    next();
  },
];

export const validateEnvSecurity = (): void => {
  // JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET;
  const defaultSecret = 'CHANGE_ME_USE_LONG_RANDOM_SECRET_IN_PRODUCTION';

  if (!jwtSecret) {
    throw new UnauthorizedError('JWT_SECRET no está definido en las variables de entorno');
  }

  if (jwtSecret === defaultSecret) {
    throw new UnauthorizedError('JWT_SECRET tiene el valor por defecto. Cámbielo antes de iniciar.');
  }
  if (jwtSecret.length < 32) {
    throw new UnauthorizedError('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  // INVITE_JWT_SECRET validation (must be different from JWT_SECRET)
  const inviteSecret = process.env.INVITE_JWT_SECRET;
  if (!inviteSecret) {
    logger.warn('⚠️ INVITE_JWT_SECRET no está definido. Se usará JWT_SECRET como fallback. Define INVITE_JWT_SECRET en producción.');
  } else if (inviteSecret === jwtSecret) {
    logger.warn('⚠️ INVITE_JWT_SECRET es igual a JWT_SECRET. Deben ser diferentes para seguridad óptima.');
  } else if (inviteSecret.length < 32) {
    logger.warn('⚠️ INVITE_JWT_SECRET debería tener al menos 32 caracteres.');
  }

  // PHI_MASTER_KEY validation (MANDATORY — envelope encryption master key)
  const phiMasterKey = process.env.PHI_MASTER_KEY;
  if (!phiMasterKey) {
    throw new UnauthorizedError('PHI_MASTER_KEY no está definida. Es obligatoria para cifrado PHI (64 hex chars).');
  }
  const phiKeyBytes = Buffer.from(phiMasterKey, 'hex');
  if (phiKeyBytes.length !== 32) {
    throw new UnauthorizedError('PHI_MASTER_KEY debe ser exactamente 64 caracteres hexadecimales (32 bytes).');
  }

  // AUDIT_HMAC_SECRET validation (MANDATORY — audit chain integrity)
  const auditSecret = process.env.AUDIT_HMAC_SECRET;
  if (!auditSecret) {
    throw new UnauthorizedError('AUDIT_HMAC_SECRET no está definida. Es obligatoria para la integridad del audit log.');
  }
  if (auditSecret.length < 32) {
    throw new UnauthorizedError('AUDIT_HMAC_SECRET debe tener al menos 32 caracteres.');
  }

  // JWT_PRIVATE_KEY / JWT_PUBLIC_KEY validation (production only)
  if (isProduction) {
    const jwtPriv = process.env.JWT_PRIVATE_KEY;
    const jwtPub = process.env.JWT_PUBLIC_KEY;
    if (jwtPriv && !jwtPub) {
      throw new UnauthorizedError('JWT_PRIVATE_KEY está definida pero JWT_PUBLIC_KEY no. Deben definirse ambas.');
    }
    if (jwtPub && !jwtPriv) {
      throw new UnauthorizedError('JWT_PUBLIC_KEY está definida pero JWT_PRIVATE_KEY no. Deben definirse ambas.');
    }
  }

  // ENCRYPTION_KEY validation
  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey) {
    logger.warn('⚠️ ENCRYPTION_KEY no está definida. 2FA/TOTP no estará disponible hasta que se configure.');
  } else if (encKey.length < 16) {
    logger.warn('⚠️ ENCRYPTION_KEY debería tener al menos 16 caracteres.');
  }

  // DATABASE_URL validation
  if (!process.env.DATABASE_URL) {
    throw new UnauthorizedError('DATABASE_URL no está definida.');
  }

  // RECAPTCHA_SECRET_KEY (optional)
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    logger.warn('⚠️ RECAPTCHA_SECRET_KEY no está definida. El CAPTCHA estará deshabilitado hasta que se configure.');
  }

  if (!isProduction) {
    logger.warn('⚠️ Ejecutando en modo desarrollo - algunas protecciones de seguridad están deshabilitadas');
  }
};