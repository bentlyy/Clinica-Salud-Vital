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
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
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

  if (!process.env.RECAPTCHA_SECRET_KEY) {
    logger.warn('⚠️ RECAPTCHA_SECRET_KEY no está definida. El CAPTCHA estará deshabilitado hasta que se configure.');
  }

  if (!isProduction) {
    logger.warn('⚠️ Ejecutando en modo desarrollo - algunas protecciones de seguridad están deshabilitadas');
  }
};