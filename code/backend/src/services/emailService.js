let nodemailer = null;

try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}

function smtpReady() {
  return Boolean(
    nodemailer &&
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getEmailConfigStatus() {
  return {
    nodemailerInstalled: Boolean(nodemailer),
    smtpHostConfigured: Boolean(process.env.SMTP_HOST),
    smtpPortConfigured: Boolean(process.env.SMTP_PORT),
    smtpUserConfigured: Boolean(process.env.SMTP_USER),
    smtpPassConfigured: Boolean(process.env.SMTP_PASS),
    mailFromConfigured: Boolean(process.env.MAIL_FROM),
    ready: smtpReady(),
  };
}

async function verifyEmailConnection() {
  if (!smtpReady()) {
    return {
      verified: false,
      skipped: true,
      reason: "SMTP settings are incomplete",
      config: getEmailConfigStatus(),
    };
  }

  const transporter = createTransporter();
  await transporter.verify();
  return { verified: true };
}

async function sendEmail({ to, subject, text, html }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: "No recipient email address" };
  }

  if (!smtpReady()) {
    console.log(`[EMAIL MOCK] To: ${recipients.join(", ")}`);
    console.log(`[EMAIL MOCK] Subject: ${subject}`);
    console.log(`[EMAIL MOCK] ${text}`);
    return { sent: true, mock: true };
  }

  const transporter = createTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const result = await transporter.sendMail({
    from,
    to: recipients,
    subject,
    text,
    html,
  });

  return { sent: true, messageId: result.messageId };
}

module.exports = {
  getEmailConfigStatus,
  sendEmail,
  verifyEmailConnection,
};
