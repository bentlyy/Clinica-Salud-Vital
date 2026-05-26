import helmet from 'helmet';
import hpp from 'hpp';
import { logger } from '../utils/logger.js';
import { UnauthorizedError } from '../utils/errors.js';

const isProduction = process.env.NODE_ENV === 'production';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
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
    referrerPolicy: false,
    xssFilter: true,
  }),
  hpp(),
];

export const validateEnvSecurity = (): void => {
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

  if (!isProduction) {
    logger.warn('⚠️ Ejecutando en modo desarrollo - algunas protecciones de seguridad están deshabilitadas');
  }
};