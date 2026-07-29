import helmet from 'helmet';
import hpp from 'hpp';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { UnauthorizedError } from '../utils/errors.js';

const isProduction = process.env.NODE_ENV === 'production';

const helmetDirectives = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        ...(isProduction ? [] : ["'unsafe-eval'", "'unsafe-inline'"]),
        "https://www.google.com/recaptcha/",
        "https://www.gstatic.com/recaptcha/",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
      frameSrc: ["'self'", "https://www.google.com/recaptcha/", "https://www.google.com/recaptcha/"],
      workerSrc: ["'self'", "blob:", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'none'"],
    },
  },
};

export const securityMiddleware = [
  helmet({
    ...(helmetDirectives || {}),
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
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

   // COOKIE_SECRET validation (MANDATORY — cookie signing must use its own secret)
   const cookieSecret = process.env.COOKIE_SECRET;
   if (!cookieSecret) {
     throw new UnauthorizedError('COOKIE_SECRET no está definida en las variables de entorno');
   }
   if (cookieSecret.length < 32) {
     throw new UnauthorizedError('COOKIE_SECRET debe tener al menos 32 caracteres.');
  }

  // AUDIT_HMAC_SECRET validation (MANDATORY — audit chain integrity)
  const auditSecret = process.env.AUDIT_HMAC_SECRET;
  if (!auditSecret) {
    throw new UnauthorizedError('AUDIT_HMAC_SECRET no está definida. Es obligatoria para la integridad del audit log.');
  }
  if (auditSecret.length < 32) {
    throw new UnauthorizedError('AUDIT_HMAC_SECRET debe tener al menos 32 caracteres.');
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
    logger.info('ℹ️ Ejecutando en modo desarrollo — CSP habilitado con relajaciones de dev');
  }
};