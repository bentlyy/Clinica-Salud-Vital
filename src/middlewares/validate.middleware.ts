import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export type ZodValidationSchema = ZodSchema;

export const validateZod = (schema: ZodValidationSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`) 
        });
      }
      next(error);
    }
  };
};