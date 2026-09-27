// Development-only stand-in for Brevo: messages are written to server/dev-outbox/ and viewable at /api/dev/outbox.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const OUTBOX_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dev-outbox");

export async function writeToOutbox(message) {
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  const createdAt = new Date();
  const id = `${createdAt.getTime()}-${crypto.randomUUID().slice(0, 8)}`;
  await fs.writeFile(path.join(OUTBOX_DIR, `${id}.json`), JSON.stringify({ id, createdAt, ...message }, null, 2));
  // The message body holds the code, so only the envelope is logged.
  console.log(`[dev-outbox] ${message.kind.toUpperCase()} "${message.subject}" → ${message.to}  (${config.clientUrl}/api/dev/outbox)`);
  return { id };
}

export async function listOutbox(limit = 50) {
  let files;
  try {
    files = await fs.readdir(OUTBOX_DIR);
  } catch {
    return [];
  }
  const ids = files.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, limit);
  return Promise.all(ids.map(async (file) => JSON.parse(await fs.readFile(path.join(OUTBOX_DIR, file), "utf8"))));
}

export async function readOutboxMessage(id) {
  if (!/^[\w-]+$/.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(OUTBOX_DIR, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}
