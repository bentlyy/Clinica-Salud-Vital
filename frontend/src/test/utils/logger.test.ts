import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from '@/shared/utils/logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs errors with the [ERROR] prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logger.error('failed', err);
    expect(spy).toHaveBeenCalledWith('[ERROR]', 'failed', err);
  });

  it('logs info with the [INFO] prefix in development', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello', 42);
    expect(spy).toHaveBeenCalledWith('[INFO]', 'hello', 42);
  });

  it('logs warnings with the [WARN] prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('careful');
    expect(spy).toHaveBeenCalledWith('[WARN]', 'careful');
  });

  it('logs debug messages with the [DEBUG] prefix', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('trace');
    expect(spy).toHaveBeenCalledWith('[DEBUG]', 'trace');
  });

  it('supports multiple arguments', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('a', { b: 1 }, [2, 3]);
    expect(spy).toHaveBeenCalledWith('[ERROR]', 'a', { b: 1 }, [2, 3]);
  });
});
