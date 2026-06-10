export function sanitizeError(err) {
  if (!err) return 'Ocurrió un error inesperado';
  
  const message = err?.response?.data?.error || err?.message || String(err);
  const stack = err?.stack || '';
  
  // Only hide known internal patterns (more precise matching)
  if (message.includes('at ') && message.includes('(') && message.includes(')')) return 'Error interno del servidor';
  if (stack.includes('at ') && stack.includes('(') && stack.includes(')')) return 'Error interno del servidor';
  if (message.includes('node_modules')) return 'Error interno del servidor';
  if (/[A-Z]:\\/i.test(message) || message.includes('/app/')) return 'Error interno del servidor';
  
  // SQL injection patterns (actual SQL syntax, not just words)
  if (/SELECT\s+\*/i.test(message) && /FROM\s+/i.test(message)) return 'Error interno del servidor';
  if (/INSERT\s+INTO\s+/i.test(message)) return 'Error interno del servidor';
  if (/DROP\s+(TABLE|DATABASE|INDEX|VIEW)\s+/i.test(message)) return 'Error interno del servidor';
  if (/UNION\s+(ALL\s+)?SELECT\s+/i.test(message)) return 'Error interno del servidor';
  if (/\bOR\s+1\s*=\s*1\b/i.test(message)) return 'Error interno del servidor';
  if (/\bAND\s+1\s*=\s*1\b/i.test(message)) return 'Error interno del servidor';
  if (/;\s*('|--)/.test(message)) return 'Error interno del servidor';
  if (/WAITFOR\s+DELAY\s+/i.test(message)) return 'Error interno del servidor';
  
  return message;
}
