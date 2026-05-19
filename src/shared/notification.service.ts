import { sendEmail, EmailOptions } from './email.service.js';
import { sendSms, SmsOptions } from './sms.service.js';
import { logger } from '../utils/logger.js';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'all';

export interface NotificationOptions {
  to: string;
  subject?: string;
  html?: string;
  smsBody?: string;
  channels: NotificationChannel[];
  phone?: string;
}

export const sendNotification = async (options: NotificationOptions): Promise<{ email?: boolean; sms?: boolean }> => {
  const results: { email?: boolean; sms?: boolean } = {};
  const { to, subject, html, smsBody, channels, phone } = options;

  for (const channel of channels) {
    switch (channel) {
      case 'email':
        if (subject && html) {
          const emailResult = await sendEmail({ to, subject, html } as EmailOptions);
          results.email = emailResult.sent;
          if (!emailResult.sent) {
            logger.warn('Email notification failed', { to, error: emailResult.error });
          }
        }
        break;
      case 'sms':
      case 'whatsapp':
        if (smsBody && phone) {
          const smsResult = await sendSms({ to: phone, body: smsBody });
          results.sms = smsResult.sent;
        } else if (smsBody && channel === 'whatsapp' && phone) {
          const whatsappResult = await sendSms({ to: phone, body: smsBody });
          results.sms = whatsappResult.sent;
        }
        break;
      case 'all':
        if (subject && html) {
          const emailR = await sendEmail({ to, subject, html } as EmailOptions);
          results.email = emailR.sent;
        }
        if (smsBody && phone) {
          const smsR = await sendSms({ to: phone, body: smsBody });
          results.sms = smsR.sent;
        }
        break;
    }
  }

  return results;
};
