const isDev = import.meta.env.DEV;
const noop = (): void => {};

export const logger = {
  info: isDev ? (...args: unknown[]) => console.info('[INFO]', ...args) : noop,
  warn: isDev ? (...args: unknown[]) => console.warn('[WARN]', ...args) : noop,
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  debug: isDev ? (...args: unknown[]) => console.debug('[DEBUG]', ...args) : noop,
};
