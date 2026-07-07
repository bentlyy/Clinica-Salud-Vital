import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export type ZodValidationSchema = ZodSchema;

export const validateZod = <T extends ZodSchema>(schema: T, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
      const parsed = schema.parse(data);
      if (source === 'body') req.body = parsed;
      else if (source === 'params') Object.assign(req.params, parsed);
      else Object.assign(req.query, parsed);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Validation failed', { errors: error.issues });
          next(new BadRequestError('Validation failed'));
        } else {
          next(new BadRequestError('Validation failed: ' + error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; ')));
        }
        return;
      }
      next(error);
    }
  };
};