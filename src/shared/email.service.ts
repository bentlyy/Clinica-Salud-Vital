import nodemailer, { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  sent: boolean;
  error?: string;
}

const transporter: Transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<EmailResult> => {
  try {
    await transporter.sendMail({
      from: `"Clinic App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return { sent: true };
  } catch (err) {
    const message = (err as Error).message;
    return { sent: false, error: message };
  }
};