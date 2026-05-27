import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export type ZodValidationSchema = ZodSchema;

export const validateZod = (schema: ZodValidationSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
      const parsed = schema.parse(data);
      if (source === 'body') req.body = parsed;
      else if (source === 'params') req.params = parsed as any;
      else req.query = parsed as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`) 
        });
        return;
      }
      next(error);
    }
  };
};