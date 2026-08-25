import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  LAB_EVENTS,
  emitLabEvent,
  onLabEvent,
  offLabEvent,
} from '../../src/modules/laboratory/lab-events.service.js';

describe('lab-events.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LAB_EVENTS constants', () => {
    it('defines event type constants', () => {
      expect(LAB_EVENTS).toBeDefined();
      expect(typeof LAB_EVENTS).toBe('object');
      expect(Object.keys(LAB_EVENTS).length).toBeGreaterThan(0);
    });

    it('has string values for all event types', () => {
      for (const [key, value] of Object.entries(LAB_EVENTS)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('emitLabEvent', () => {
    it('is a function', () => {
      expect(typeof emitLabEvent).toBe('function');
    });

    it('does not throw when emitting an event', () => {
      expect(() => emitLabEvent('test_event', { data: 1 })).not.toThrow();
    });
  });

  describe('onLabEvent', () => {
    it('registers a listener and returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = onLabEvent('test_event', listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('calls listener when matching event is emitted', () => {
      const listener = vi.fn();
      const eventName = `test_${Date.now()}`;
      onLabEvent(eventName, listener);

      emitLabEvent(eventName, { value: 42 });

      expect(listener).toHaveBeenCalledWith({ value: 42 });
    });

    it('unsubscribes listener when unsubscribe is called', () => {
      const listener = vi.fn();
      const eventName = `test_unsub_${Date.now()}`;
      const unsubscribe = onLabEvent(eventName, listener);

      unsubscribe();
      emitLabEvent(eventName, { value: 1 });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('offLabEvent', () => {
    it('removes all listeners for an event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const eventName = `test_off_${Date.now()}`;

      onLabEvent(eventName, listener1);
      onLabEvent(eventName, listener2);
      offLabEvent(eventName, listener2);

      emitLabEvent(eventName, {});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });
  });
});
