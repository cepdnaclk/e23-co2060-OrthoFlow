let nodemailer = null;

try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}

function setting(name) {
  return String(process.env[name] || "").trim();
}

function emailProvider() {
  return setting("EMAIL_PROVIDER").toLowerCase() || (setting("RESEND_API_KEY") ? "resend" : "smtp");
}

function smtpReady() {
  const port = Number(setting("SMTP_PORT"));
  return Boolean(
    nodemailer && setting("SMTP_HOST") &&
    Number.isInteger(port) && port > 0 && port <= 65535 &&
    setting("SMTP_USER") && setting("SMTP_PASS")
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: setting("SMTP_HOST"),
    port: Number(setting("SMTP_PORT")),
    secure: setting("SMTP_SECURE").toLowerCase() === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: setting("SMTP_USER"),
      pass: setting("SMTP_PASS"),
    },
  });
}

function getEmailConfigStatus() {
  const provider = emailProvider();
  const resendReady = Boolean(setting("RESEND_API_KEY") && setting("MAIL_FROM"));
  return {
    provider,
    nodemailerInstalled: Boolean(nodemailer),
    smtpHostConfigured: Boolean(setting("SMTP_HOST")),
    smtpPortConfigured: Boolean(setting("SMTP_PORT")),
    smtpUserConfigured: Boolean(setting("SMTP_USER")),
    smtpPassConfigured: Boolean(setting("SMTP_PASS")),
    mailFromConfigured: Boolean(setting("MAIL_FROM")),
    resendApiKeyConfigured: Boolean(setting("RESEND_API_KEY")),
    gmailConfigured: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER"].every(key => Boolean(setting(key))),
    ready: provider === "gmail" ? ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER"].every(key => Boolean(setting(key))) : provider === "resend" ? resendReady : provider === "smtp" && smtpReady(),
  };
}

function unavailableReason(config) {
  if (config.provider === "gmail") return "GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_SENDER are required";
  if (config.provider === "disabled") return "Email delivery is disabled";
  if (config.provider === "resend") return "RESEND_API_KEY and MAIL_FROM are required";
  if (config.provider === "smtp") return "SMTP settings are incomplete or invalid";
  return "EMAIL_PROVIDER must be gmail, smtp, resend, or disabled";
}

async function verifyEmailConnection() {
  const config = getEmailConfigStatus();
  if (!config.ready) {
    return { verified: false, skipped: true, reason: unavailableReason(config), config };
  }

  if (config.provider === "gmail") {
    await require("./gmailService").gmailDelivery.authorize();
    return { verified: false, authorizationValid: true, provider: "gmail", reason: "Gmail OAuth authorization succeeded; email delivery has not been tested" };
  }

  if (config.provider === "resend") {
    // Sending-only Resend keys cannot list domains or API keys. Do not send an
    // email merely to check configuration, or claim credentials were verified.
    return {
      verified: false,
      configurationValid: true,
      skipped: true,
      reason: "Resend configuration is present; API key and sender delivery are not verified (no email sent)",
      config,
    };
  }

  try {
    await createTransporter().verify();
  } catch {
    throw new Error("SMTP connection verification failed");
  }
  return { verified: true, provider: "smtp" };
}

async function sendResendEmail(message) {
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${setting("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ from: setting("MAIL_FROM"), ...message }),
    });
  } catch {
    throw new Error("Resend email request failed or timed out");
  }

  // Provider errors may echo recipient addresses or message content. Expose
  // only the HTTP status because errors are persisted in reminder records.
  if (!response.ok) throw new Error(`Resend email delivery failed (HTTP ${response.status})`);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Resend returned an invalid delivery response");
  }
  if (typeof result?.id !== "string" || !result.id.trim()) {
    throw new Error("Resend did not confirm email acceptance");
  }
  return { sent: true, provider: "resend", messageId: result.id };
}

async function sendEmail({ to, subject, text, html }) {
  const recipients = (Array.isArray(to) ? to : [to])
    .filter(value => typeof value === "string" && value.trim())
    .map(value => value.trim());
  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: "No recipient email address" };
  }

  const config = getEmailConfigStatus();
  if (!config.ready) {
    // Never mark unavailable delivery as successful or log patient content.
    return { sent: false, skipped: true, reason: unavailableReason(config) };
  }

  if (config.provider === "resend") {
    return sendResendEmail({ to: recipients, subject, text, html });
  }

  if (config.provider === "gmail") return require("./gmailService").gmailDelivery.send({ to: recipients, subject, text, html });

  let result;
  try {
    result = await createTransporter().sendMail({
      from: setting("MAIL_FROM") || setting("SMTP_USER"),
      to: recipients,
      subject,
      text,
      html,
    });
  } catch {
    throw new Error("SMTP email delivery failed");
  }
  // A partial SMTP acceptance must not mark every clinician as notified.
  if (!result.accepted?.length || result.rejected?.length) {
    throw new Error("SMTP did not accept every recipient");
  }
  return { sent: true, provider: "smtp", messageId: result.messageId };
}

module.exports = {
  getEmailConfigStatus,
  sendEmail,
  verifyEmailConnection,
};
