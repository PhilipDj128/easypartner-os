import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('din_')) return null;
  return new Resend(key);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  const payload: {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  } = {
    from: 'EasyPartner <noreply@easypartner.se>',
    to: options.to,
    subject: options.subject,
  };
  if (options.html) payload.html = options.html;
  if (options.text) payload.text = options.text;
  if (!payload.html && !payload.text) payload.html = '';
  const resend = getResend();
  if (!resend) throw new Error('RESEND_API_KEY är inte konfigurerad');
  return resend.emails.send(payload as Parameters<typeof resend.emails.send>[0]);
}
