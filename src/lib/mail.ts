import nodemailer from "nodemailer";
import { smtpConfig } from "./env";
import { HR_CONTACT_EMAIL } from "./invite-email";

export function mailConfigured() {
  const smtp = smtpConfig();
  return Boolean(smtp.host && smtp.user && smtp.pass);
}

export function mailFromAddress() {
  const smtp = smtpConfig();
  const name = smtp.fromName || "Transform Solution";
  if (smtp.from.includes("@")) return smtp.from;
  return `"${name}" <${smtp.user}>`;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const smtp = smtpConfig();
  if (!smtp.host || !smtp.user || !smtp.pass) {
    throw new Error(
      "Invitation email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    );
  }
  const port = Number(smtp.port || "587");
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  await transporter.sendMail({
    from: mailFromAddress(),
    to: options.to,
    replyTo: HR_CONTACT_EMAIL,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
