import nodemailer from 'nodemailer';
import { ENV } from './env.config';

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  await mailer.sendMail({
    from: `"RESTREN SYSTEM" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });
};
