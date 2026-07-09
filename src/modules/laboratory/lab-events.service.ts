import { EventEmitter } from 'events';

const labEmitter = new EventEmitter();
labEmitter.setMaxListeners(200);

export const LAB_EVENTS = {
  METRICS_UPDATE: 'metrics',
  NEW_REQUEST: 'new-request',
  STATUS_CHANGE: 'status-change',
  NOTIFICATION: 'notification',
} as const;

export const emitLabEvent = (event: string, data: unknown): void => {
  labEmitter.emit(event, data);
};

export const onLabEvent = (event: string, listener: (data: unknown) => void): (() => void) => {
  labEmitter.on(event, listener);
  return () => { labEmitter.off(event, listener); };
};

export const offLabEvent = (event: string, listener: (data: unknown) => void): void => {
  labEmitter.off(event, listener);
};
