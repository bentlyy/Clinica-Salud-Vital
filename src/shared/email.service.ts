import nodemailer, { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger.js';
import { tenantService } from './multi-tenant.service.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
}

export interface EmailResult {
  sent: boolean;
  error?: string;
}

type EmailProvider = 'sendgrid' | 'smtp' | 'log';

let provider: EmailProvider = 'log';
let transporter: Transporter | null = null;
const DEFAULT_FROM_NAME = 'Clinic App';

const getFromName = (tenantId?: string): string => {
  if (tenantId) {
    const tenant = tenantService.getById(tenantId);
    if (tenant?.config?.email_from_name) return String(tenant.config.email_from_name);
  }
  return DEFAULT_FROM_NAME;
};

const getFromEmail = (tenantId?: string): string => {
  if (tenantId) {
    const tenant = tenantService.getById(tenantId);
    if (tenant?.config?.email_from_address) return String(tenant.config.email_from_address);
  }
  return process.env.EMAIL_USER || 'noreply@clinic.app';
};

const initSendGrid = (): boolean => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;

  try {
    sgMail.setApiKey(apiKey);
    provider = 'sendgrid';
    logger.info('[Email] Proveedor SendGrid configurado');
    return true;
  } catch (err) {
    const error = err as Error;
    logger.error('[Email] Error al configurar SendGrid:', { error: error.message });
    return false;
  }
};

const initSMTP = (): boolean => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) return false;

  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass },
    });
    provider = 'smtp';
    logger.info('[Email] Proveedor SMTP (Gmail) configurado');
    return true;
  } catch (err) {
    const error = err as Error;
    logger.error('[Email] Error al crear transporte SMTP:', { error: error.message });
    return false;
  }
};

export const validateEmailConfig = (): void => {
  initSendGrid() || initSMTP();

  if (provider === 'smtp' && transporter) {
    transporter.verify((err: Error | null) => {
      if (err) {
        logger.error('[Email] Falló verificación SMTP:', { error: (err as Error).message });
      } else {
        logger.info('[Email] Conexión SMTP verificada correctamente');
      }
    });
  }

  if (provider === 'log') {
    logger.warn('[Email] Sin proveedor configurado. Los emails se mostrarán en consola.');
    logger.warn('[Email] Configura SENDGRID_API_KEY o EMAIL_USER + EMAIL_PASS en las variables de entorno.');
  }
};

const sendViaSendGrid = async ({ to, subject, html, tenantId }: EmailOptions): Promise<EmailResult> => {
  try {
    await sgMail.send({
      to,
      from: { email: getFromEmail(tenantId), name: getFromName(tenantId) },
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    const error = err as Error;
    logger.error('[Email] Error SendGrid:', { error: error.message, to, subject });
    return { sent: false, error: error.message };
  }
};

const sendViaSMTP = async ({ to, subject, html, tenantId }: EmailOptions): Promise<EmailResult> => {
  if (!transporter) return { sent: false, error: 'SMTP not initialized' };

  try {
    await transporter.sendMail({
      from: `"${getFromName(tenantId)}" <${getFromEmail(tenantId)}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    const error = err as Error;
    logger.error('[Email] Error SMTP:', { error: error.message, stack: error.stack, to, subject });
    return { sent: false, error: error.message };
  }
};

export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  if (provider === 'log') {
    logger.info(`[Email] Modo log — Para: ${options.to} | Asunto: ${options.subject}`);
    return { sent: true };
  }

  if (provider === 'sendgrid') return sendViaSendGrid(options);
  if (provider === 'smtp') return sendViaSMTP(options);

  logger.warn('[Email] Sin proveedor — modo log');
  return { sent: true };
};
