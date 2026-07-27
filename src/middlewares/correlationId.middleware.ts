import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CORRELATION_ID_HEADER = 'X-Request-ID';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string | undefined;
  const correlationId = existingId || crypto.randomUUID();

  req.headers[CORRELATION_ID_HEADER.toLowerCase()] = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
};
