const dotenv = require("dotenv");
dotenv.config({ quiet: true });

const { getEmailConfigStatus, sendEmail, verifyEmailConnection } = require("../services/emailService");

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

async function main() {
  const to = process.argv[2] || process.env.SMTP_USER;
  const status = getEmailConfigStatus();

  console.log("Email config:");
  console.log({
    ...status,
    smtpUser: maskEmail(process.env.SMTP_USER),
    testRecipient: maskEmail(to),
  });

  if (!to) {
    throw new Error("Provide a recipient email: npm run test:email -- patient@example.com");
  }

  console.log("Checking email configuration...");
  const verification = await verifyEmailConnection();
  if (verification.reason) console.log(verification.reason);
  if (!status.ready) throw new Error("Email delivery is not configured");

  console.log("Sending test email...");
  const result = await sendEmail({
    to,
    subject: "OrthoRecords test email",
    text: "This is a test email from the OrthoRecords appointment reminder system.",
    html: "<p>This is a test email from the OrthoRecords appointment reminder system.</p>",
  });

  console.log("Test email result:");
  console.log(result);
  if (!result.sent) throw new Error("Provider did not accept the test email");
}

main().catch((error) => {
  console.error("Test email failed:");
  console.error(error.message);

  if (error.code) console.error(`code: ${error.code}`);
  if (error.command) console.error(`command: ${error.command}`);
  if (error.responseCode) console.error(`responseCode: ${error.responseCode}`);
  if (error.response) console.error(`response: ${error.response}`);

  process.exit(1);
});
