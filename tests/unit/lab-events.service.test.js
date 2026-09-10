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

    it('does not throw when emitting an event for a tenant', () => {
      expect(() => emitLabEvent('test_event', { data: 1 }, 'tenant-a')).not.toThrow();
    });
  });

  describe('onLabEvent', () => {
    it('registers a listener and returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = onLabEvent('test_event', 'tenant-a', listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('calls listener when matching event is emitted for the same tenant', () => {
      const listener = vi.fn();
      const eventName = `test_${Date.now()}`;
      onLabEvent(eventName, 'tenant-a', listener);

      emitLabEvent(eventName, { value: 42 }, 'tenant-a');

      expect(listener).toHaveBeenCalledWith({ value: 42, tenant_id: 'tenant-a' });
    });

    it('does not call listener when the event is emitted for a different tenant', () => {
      const listener = vi.fn();
      const eventName = `test_other_${Date.now()}`;
      onLabEvent(eventName, 'tenant-a', listener);

      emitLabEvent(eventName, { value: 42 }, 'tenant-b');

      expect(listener).not.toHaveBeenCalled();
    });

    it('unsubscribes listener when unsubscribe is called', () => {
      const listener = vi.fn();
      const eventName = `test_unsub_${Date.now()}`;
      const unsubscribe = onLabEvent(eventName, 'tenant-a', listener);

      unsubscribe();
      emitLabEvent(eventName, { value: 1 }, 'tenant-a');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('offLabEvent', () => {
    it('removes the listener for an event in a tenant', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const eventName = `test_off_${Date.now()}`;

      onLabEvent(eventName, 'tenant-a', listener1);
      onLabEvent(eventName, 'tenant-a', listener2);
      offLabEvent(eventName, 'tenant-a', listener2);

      emitLabEvent(eventName, {}, 'tenant-a');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });

    it('does not remove listeners subscribed on other tenants', () => {
      const listener = vi.fn();
      const eventName = `test_off_tenant_${Date.now()}`;

      onLabEvent(eventName, 'tenant-a', listener);
      offLabEvent(eventName, 'tenant-b', listener);

      emitLabEvent(eventName, {}, 'tenant-a');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
