import { config } from "../config.js";
import { templates } from "../templates/index.js";
import { writeToOutbox } from "./outbox.service.js";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail({ to, name, subject, html, text, tag }) {
  if (config.devOutbox) return writeToOutbox({ kind: "email", to, subject, html, text });

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": config.BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: config.BREVO_SENDER_EMAIL, name: config.BREVO_SENDER_NAME },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
      textContent: text,
      tags: tag ? [tag] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Brevo error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function sendTemplate(templateName, { to, name, ...data }) {
  const { subject, html, text } = templates[templateName](data);
  return sendEmail({ to, name, subject, html, text, tag: templateName });
}
