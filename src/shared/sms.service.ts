import { logger } from '../utils/logger.js';

export interface SmsOptions {
  to: string;
  body: string;
}

export interface SmsResult {
  sent: boolean;
  provider: string;
  error?: string;
}

const getProvider = (): string => process.env.SMS_PROVIDER || 'log';

export const sendSms = async ({ to, body }: SmsOptions): Promise<SmsResult> => {
  const provider = getProvider();

  try {
    switch (provider) {
      case 'twilio': {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;
        if (!accountSid || !authToken || !from) {
          throw new Error('Twilio credentials not configured');
        }
        const twilio = await import('twilio');
        const client = twilio.default(accountSid, authToken);
        await client.messages.create({ body, from, to });
        return { sent: true, provider: 'twilio' };
      }
      case 'whatsapp': {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
        if (!accountSid || !authToken || !from) {
          throw new Error('WhatsApp credentials not configured');
        }
        const twilio = await import('twilio');
        const client = twilio.default(accountSid, authToken);
        await client.messages.create({ body, from, to: `whatsapp:${to}` });
        return { sent: true, provider: 'whatsapp' };
      }
      default:
        logger.info(`[SMS MOCK] To: ${to}, Body: ${body}`);
        return { sent: true, provider: 'log' };
    }
  } catch (err) {
    const message = (err as Error).message;
    logger.error(`SMS send failed (${provider})`, { error: message, to });
    return { sent: false, provider, error: message };
  }
};
