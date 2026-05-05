import { logAction } from './audit.service.js';

export const auditMiddleware = (action, resource_type, getIdFromResponse = null) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const resource_id = getIdFromResponse ? getIdFromResponse(body) : req.params.id;

      logAction({
        user_id: req.user?.id,
        action,
        resource_type,
        resource_id,
        new_values: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      }).catch(err => console.error('Audit log error:', err));

      return originalJson(body);
    };

    next();
  };
};
