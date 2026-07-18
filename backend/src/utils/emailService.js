import nodemailer from 'nodemailer';

function boolFromEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

export function getEmailConfigStatus() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = boolFromEnv(process.env.SMTP_SECURE, port === 465);
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const fromName = process.env.SMTP_FROM_NAME || 'VituFinance';

  return {
    configured: Boolean(user && pass && fromEmail),
    host,
    port,
    secure,
    user,
    fromEmail,
    fromName
  };
}

function createTransporter() {
  const config = getEmailConfigStatus();
  if (!config.configured) {
    throw new Error('SMTP 邮件服务未配置');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
    }
  });
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEmailHtml(content) {
  const safeBody = escapeHtml(content).replace(/\n/g, '<br>');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1f2937;">
      ${safeBody}
    </div>
  `;
}

export async function verifyEmailTransport() {
  const transporter = createTransporter();
  await transporter.verify();
  return true;
}

export async function sendBulkEmail({ recipients, subject, content }) {
  const config = getEmailConfigStatus();
  const transporter = createTransporter();
  const html = renderEmailHtml(content);
  const from = `"${config.fromName}" <${config.fromEmail}>`;
  const results = [];

  for (const recipient of recipients) {
    const email = recipient.email;
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        text: content,
        html
      });

      results.push({
        wallet_address: recipient.wallet_address,
        email,
        success: true,
        message_id: info.messageId || ''
      });
    } catch (error) {
      results.push({
        wallet_address: recipient.wallet_address,
        email,
        success: false,
        error: error?.message || '发送失败'
      });
    }
  }

  const successCount = results.filter((item) => item.success).length;
  return {
    results,
    success_count: successCount,
    failure_count: results.length - successCount
  };
}
