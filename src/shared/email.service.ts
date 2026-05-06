import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter: Transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<void> => {
  await transporter.sendMail({
    from: `"Clinic App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};