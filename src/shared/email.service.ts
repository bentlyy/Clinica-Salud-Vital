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

let transporter: Transporter | null = null;
let isEmailConfigured = false;

const initTransporter = (): boolean => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    logger.warn('[Email] EMAIL_USER / EMAIL_PASS no configurados. Los emails se mostrarán en consola.');
    isEmailConfigured = false;
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    isEmailConfigured = true;
    logger.info('[Email] Transporte SMTP configurado correctamente');
    return true;
  } catch (err) {
    const error = err as Error;
    logger.error('[Email] Error al crear transporte SMTP:', { error: error.message });
    isEmailConfigured = false;
    return false;
  }
};

export const validateEmailConfig = (): void => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser) {
    logger.warn('[Email] EMAIL_USER no está definido en las variables de entorno');
  }
  if (!emailPass) {
    logger.warn('[Email] EMAIL_PASS no está definido en las variables de entorno');
  }

  if (initTransporter()) {
    transporter?.verify((err) => {
      if (err) {
        logger.error('[Email] Falló verificación SMTP:', { error: (err as Error).message });
      } else {
        logger.info('[Email] Conexión SMTP verificada correctamente');
      }
    });
  }
};

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<EmailResult> => {
  if (!isEmailConfigured || !transporter) {
    logger.info(`[Email] Modo log — Para: ${to} | Asunto: ${subject}`);
    return { sent: true };
  }

  try {
    await transporter.sendMail({
      from: `"Clinic App" <${process.env.EMAIL_USER}>`,
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
