import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  sent: boolean;
  error?: string;
}

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const isEmailConfigured = Boolean(emailUser && emailPass);

let transporter: Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
} else {
  logger.warn('[Email] EMAIL_USER / EMAIL_PASS no configurados. Los emails se mostrarán en consola.');
}

export const validateEmailConfig = (): void => {
  if (!emailUser) {
    logger.warn('[Email] EMAIL_USER no está definido en las variables de entorno');
  }
  if (!emailPass) {
    logger.warn('[Email] EMAIL_PASS no está definido en las variables de entorno');
  }
  if (isEmailConfigured) {
    logger.info('[Email] Configuración de email presente');
  }
};

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<EmailResult> => {
  if (!isEmailConfigured || !transporter) {
    logger.info(`[Email] Modo log — Para: ${to} | Asunto: ${subject}`);
    return { sent: true };
  }

  try {
    await transporter.sendMail({
      from: `"Clinic App" <${emailUser}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    const error = err as Error;
    logger.error('[Email] Error al enviar:', { error: error.message, stack: error.stack, to, subject });
    return { sent: false, error: error.message };
  }
};
