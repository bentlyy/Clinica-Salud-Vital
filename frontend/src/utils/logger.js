const isDev = import.meta.env.DEV;
const noop = () => {};

const sendToServer = (level, ...args) => {
  try {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/logs', JSON.stringify({ level, message: msg, timestamp: new Date().toISOString() }));
    }
  } catch {
    // Silently fail — logging should never break the app
  }
};

export const logger = {
  info: isDev ? (...args) => console.info('[INFO]', ...args) : noop,
  warn: isDev ? (...args) => console.warn('[WARN]', ...args) : noop,
  error: (...args) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    } else {
      sendToServer('error', ...args);
      if (typeof console.error === 'function') {
        console.error(...args);
      }
    }
  },
};
