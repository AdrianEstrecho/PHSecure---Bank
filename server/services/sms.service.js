import { config } from "../config.js";
import { writeToOutbox } from "./outbox.service.js";

const BREVO_SMS_URL = "https://api.brevo.com/v3/transactionalSMS/sms";

/** @param {string} to E.164 phone number, e.g. +639171234821 */
export async function sendSms({ to, content }) {
  if (config.devOutbox) return writeToOutbox({ kind: "sms", to, subject: "SMS", text: content });

  const res = await fetch(BREVO_SMS_URL, {
    method: "POST",
    headers: {
      "api-key": config.BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: config.BREVO_SMS_SENDER,
      recipient: to.replace(/^\+/, ""),
      content,
      type: "transactional",
    }),
  });
  if (!res.ok) throw new Error(`Brevo SMS error: ${res.status} ${await res.text()}`);
  return res.json();
}
