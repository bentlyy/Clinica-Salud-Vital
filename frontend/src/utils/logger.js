const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args) => { if (isDev) console.info('[INFO]', ...args); },
  warn: (...args) => { if (isDev) console.warn('[WARN]', ...args); },
  error: (...args) => { if (isDev) console.error('[ERROR]', ...args); },
};
