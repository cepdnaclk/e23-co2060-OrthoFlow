let twilio = null;

try {
  twilio = require("twilio");
} catch {
  twilio = null;
}

function smsReady() {
  return Boolean(
    twilio &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

function normalizePhoneNumber(phone) {
  if (!phone) return "";

  const trimmed = String(phone).trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  const countryCode = String(process.env.DEFAULT_SMS_COUNTRY_CODE || "+94").trim();
  const cleanCountryCode = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;

  if (digits.startsWith("0")) {
    return `${cleanCountryCode}${digits.slice(1)}`;
  }

  return `${cleanCountryCode}${digits}`;
}

async function sendSms({ to, body }) {
  const recipient = normalizePhoneNumber(to);
  if (!recipient) {
    return { sent: false, skipped: true, reason: "No patient phone number" };
  }

  if (!smsReady()) {
    console.log(`[SMS MOCK] To: ${recipient}`);
    console.log(`[SMS MOCK] ${body}`);
    return { sent: true, mock: true, to: recipient };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const result = await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to: recipient,
    body,
  });

  return { sent: true, sid: result.sid, to: recipient };
}

module.exports = {
  normalizePhoneNumber,
  sendSms,
};
