import nodemailer, { Transporter } from 'nodemailer';
import { debugLog, errorLog } from './debug';

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

// Không throw ra ngoài — lỗi gửi mail không được phép làm hỏng luồng nghiệp vụ chính (vd. thanh toán).
export async function sendMail({ to, subject, html }: SendMailOptions): Promise<void> {
  const client = getTransporter();

  if (!client) {
    debugLog('Mailer', 'SMTP chưa được cấu hình, bỏ qua gửi mail tới:', to, 'subject:', subject);
    return;
  }

  try {
    await client.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    debugLog('Mailer', 'sendMail - success, to:', to, 'subject:', subject);
  } catch (error) {
    errorLog('Mailer', 'sendMail', 'gửi mail thất bại tới:', to, error);
  }
}
