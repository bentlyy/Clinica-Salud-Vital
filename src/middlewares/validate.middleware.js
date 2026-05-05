import { z } from 'zod';

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
      const parsed = schema.parse(data);

      if (source === 'body') {
        Object.assign(req.body, parsed);
      } else if (source === 'params') {
        Object.assign(req.params, parsed);
      } else {
        req._parsedQuery = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError || error.name === 'ZodError') {
        const issues = error.issues || error.errors || [];
        const messages = issues.map((e) => {
          const field = e.path.length > 0 ? e.path.join('.') : 'unknown';
          return `${field}: ${e.message}`;
        });
        return res.status(400).json({
          error: 'Validation failed',
          details: messages,
        });
      }
      return res.status(400).json({
        error: 'Validation failed',
        details: [error.message || 'Unknown error'],
      });
    }
  };
};
