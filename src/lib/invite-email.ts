export const HR_CONTACT_EMAIL = "hr@transformsolution.net";
export const HR_CONTACT_PHONE = "+919558469999";
export const COMPANY_NAME = "Transform Solution";
export const EMAIL_SIGNATURE = "Regards,\nHR Team";

export type InviteEmailFields = {
  candidateName: string;
  roleName: string;
  testLink: string;
  completeBy: string;
  duration: string;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function defaultCompleteByInput(daysAhead = 7) {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCDate(ist.getUTCDate() + daysAhead);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T23:59`;
}

export function formatCompleteBy(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return value.trim() || "the date given by HR";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? "23");
  const minute = Number(match[5] ?? "59");
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  const minutes = String(minute).padStart(2, "0");
  return `${day} ${months[month - 1]} ${year}, ${hour12}:${minutes} ${ampm} IST`;
}

export function formatDuration(minutes: number) {
  if (!minutes || minutes < 1) return "90 minutes";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${rest} minutes`;
}

export function inviteEmailSubject(roleName: string) {
  return `Next Step in Your Application for ${roleName} Role at ${COMPANY_NAME}`;
}

export function inviteEmailText(fields: InviteEmailFields) {
  return [
    `Dear ${fields.candidateName},`,
    "",
    `Thank you for applying for the ${fields.roleName} role at ${COMPANY_NAME}. We truly appreciate the time and interest you have shown in joining our team.`,
    "",
    "After reviewing your profile, we are pleased to invite you to the next stage of our selection process, which is an online assessment. This test will help us better understand your skills and how they align with the role.",
    "",
    `Test Link: ${fields.testLink}`,
    "",
    "A few things to keep in mind:",
    `- Please complete the test by ${fields.completeBy}.`,
    "- Ensure you have a stable internet connection and a quiet environment.",
    `- The test duration is approximately ${fields.duration}, so please set aside enough uninterrupted time.`,
    "",
    `If you face any technical issues or have any questions, please feel free to reach out to us at ${HR_CONTACT_EMAIL} or ${HR_CONTACT_PHONE}. We are happy to help.`,
    "",
    `Please do not reply to this email, and do not send queries to the address this message was sent from. Contact us only at ${HR_CONTACT_EMAIL} or ${HR_CONTACT_PHONE}.`,
    "",
    "We wish you all the very best and look forward to your submission.",
    "",
    "--",
    EMAIL_SIGNATURE,
  ].join("\n");
}

export function inviteEmailHtml(fields: InviteEmailFields) {
  const font = "font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #222222;";
  const link = "font-family: Arial, Helvetica, sans-serif; color: #1a73e8; text-decoration: underline;";
  const name = escapeHtml(fields.candidateName);
  const role = escapeHtml(fields.roleName);
  const testLink = escapeHtml(fields.testLink);
  const completeBy = escapeHtml(fields.completeBy);
  const duration = escapeHtml(fields.duration);
  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
<body style="margin:0; padding:0; ${font}">
Dear ${name},<br /><br />
Thank you for applying for the ${role} role at ${COMPANY_NAME}. We truly appreciate the time and interest you have shown in joining our team.<br /><br />
After reviewing your profile, we are pleased to invite you to the next stage of our selection process, which is an online assessment. This test will help us better understand your skills and how they align with the role.<br /><br />
<b>Test Link:</b><br />
<a href="${testLink}" style="${link}">${testLink}</a><br /><br />
A few things to keep in mind:<br />
&bull;&nbsp;Please complete the test by ${completeBy}.<br />
&bull;&nbsp;Ensure you have a stable internet connection and a quiet environment.<br />
&bull;&nbsp;The test duration is approximately ${duration}, so please set aside enough uninterrupted time.<br /><br />
If you face any technical issues or have any questions, please feel free to reach out to us at <a href="mailto:${HR_CONTACT_EMAIL}" style="${link}">${HR_CONTACT_EMAIL}</a> or ${HR_CONTACT_PHONE}. We are happy to help.<br /><br />
Please do not reply to this email, and do not send queries to the address this message was sent from. Contact us only at <a href="mailto:${HR_CONTACT_EMAIL}" style="${link}">${HR_CONTACT_EMAIL}</a> or ${HR_CONTACT_PHONE}.<br /><br />
We wish you all the very best and look forward to your submission.<br /><br />
Regards,<br />
HR Team
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
