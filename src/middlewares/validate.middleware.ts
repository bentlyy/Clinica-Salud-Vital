import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export interface ValidationRule {
  required?: boolean;
  type?: 'email' | 'number' | 'string';
  minLength?: number;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export type ZodValidationSchema = ZodSchema;

export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
        if (rules.type === 'number' && isNaN(Number(value))) {
          errors.push(`${field} must be a number`);
        }
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    next();
  };
};

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