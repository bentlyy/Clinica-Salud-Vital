/**
 * Notification module — delegates to shared notification service.
 * For multi-channel (email + sms + WhatsApp) notifications.
 * @see src/shared/notification.service.ts
 */
export { sendNotification, getChannelStatus } from '../../shared/notification.service.js';
