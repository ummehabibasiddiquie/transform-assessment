import nodemailer, { type Transporter } from "nodemailer";
import { smtpConfig } from "./env";
import { COMPANY_NAME, HR_CONTACT_EMAIL } from "./invite-email";

let transporter: Transporter | null = null;
let transporterKey = "";

export function mailConfigured() {
  const smtp = smtpConfig();
  return Boolean(smtp.host && smtp.user && smtp.pass);
}

export function mailFromAddress() {
  const smtp = smtpConfig();
  const name = smtp.fromName || COMPANY_NAME;
  if (smtp.from.includes("@")) return smtp.from;
  return `"${name}" <${smtp.user}>`;
}

function getTransporter() {
  const smtp = smtpConfig();
  if (!smtp.host || !smtp.user || !smtp.pass) {
    throw new Error(
      "Invitation email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    );
  }
  const port = Number(smtp.port || "587");
  const pass = smtp.pass.replace(/\s+/g, "");
  const key = `${smtp.host}|${port}|${smtp.user}|${pass}`;
  if (transporter && transporterKey === key) return transporter;

  transporter?.close();
  transporterKey = key;
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: smtp.user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    pool: true,
    maxConnections: 1,
  });
  return transporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  await getTransporter().sendMail({
    from: mailFromAddress(),
    to: options.to,
    replyTo: HR_CONTACT_EMAIL,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
