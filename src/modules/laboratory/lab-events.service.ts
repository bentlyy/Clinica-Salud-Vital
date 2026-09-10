import { EventEmitter } from 'events';

const labEmitter = new EventEmitter();
labEmitter.setMaxListeners(200);

export const LAB_EVENTS = {
  METRICS_UPDATE: 'metrics',
  NEW_REQUEST: 'new-request',
  STATUS_CHANGE: 'status-change',
  NOTIFICATION: 'notification',
} as const;

export type LabEventChannel = `${string}:${string}`;

export const getChannel = (event: string, tenantId: string): LabEventChannel => `${tenantId}:${event}`;

export const emitLabEvent = (event: string, data: unknown, tenantId: string): void => {
  labEmitter.emit(getChannel(event, tenantId), { ...(data as object), tenant_id: tenantId });
};

export const onLabEvent = (
  event: string,
  tenantId: string,
  listener: (data: unknown) => void,
): (() => void) => {
  const channel = getChannel(event, tenantId);
  labEmitter.on(channel, listener);
  return () => { labEmitter.off(channel, listener); };
};

export const offLabEvent = (event: string, tenantId: string, listener: (data: unknown) => void): void => {
  labEmitter.off(getChannel(event, tenantId), listener);
};