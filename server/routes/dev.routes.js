// Development only (never mounted in production): a browsable inbox for emails/SMS written by the outbox fallback.
import { Router } from "express";
import { config } from "../config.js";
import { listOutbox, readOutboxMessage } from "../services/outbox.service.js";
import { esc } from "../templates/layout.js";

export const devRoutes = Router();

// Same brand tokens and fonts as the client (client/src/index.css).
const STYLE = `
  :root{--forest:#0E3B2A;--lime:#C6F135;--lime-soft:#EEFAC8;--ink:#0F1A14;--muted:#5F6862;--canvas:#F5F6F1;--line:#E2E5DE;--success:#1D8A4E}
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 Inter,system-ui,sans-serif;background:var(--canvas);color:var(--ink);-webkit-font-smoothing:antialiased}
  header{background:var(--forest);color:#fff;border-bottom:4px solid var(--lime)}
  .bar,main{max-width:800px;margin:0 auto;padding-left:16px;padding-right:16px}
  .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:18px;padding-bottom:18px}
  .logo{font:700 22px/1 Sora,system-ui,sans-serif;letter-spacing:-.04em;color:inherit;text-decoration:none}
  .logo i{display:inline-block;width:.2em;height:.2em;margin-left:.06em;border-radius:50%;background:var(--lime)}
  .caps{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase}
  .tag{background:var(--lime);color:var(--forest);padding:5px 10px;border-radius:999px}
  main{padding-top:32px;padding-bottom:48px}
  h1{margin:0;font:600 28px/1.2 Sora,system-ui,sans-serif;letter-spacing:-.025em}
  .lede{margin:8px 0 24px;color:var(--muted)}
  .live{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:var(--success)}
  .list{list-style:none;margin:0;padding:0;background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 1px 2px rgb(15 26 20/.04),0 18px 40px -26px rgb(15 26 20/.22)}
  .list li+li{border-top:1px solid var(--line)}
  .list a{display:flex;align-items:center;gap:14px;padding:14px 18px;color:inherit;text-decoration:none}
  .list a:hover{background:var(--canvas)}
  a:focus-visible{outline:2px solid var(--forest);outline-offset:-2px}
  .kind{flex:none;min-width:52px;text-align:center;padding:4px 8px;border-radius:999px;background:var(--lime-soft);color:var(--forest)}
  .kind.sms{background:var(--forest);color:var(--lime)}
  .text{flex:1;min-width:0}
  .subject{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .meta{display:block;font-size:13px;color:var(--muted)}
  .chev{flex:none;color:var(--muted);font-size:20px;line-height:1}
  .empty{padding:28px 18px;text-align:center;color:var(--muted)}
  .back{display:inline-block;margin-bottom:20px;color:var(--forest);font-weight:600;text-decoration:none}
  .sms-view{max-width:360px}
  .bubble{background:#fff;border:1px solid var(--line);border-radius:18px 18px 18px 4px;padding:14px 16px;white-space:pre-wrap}
`;

const page = ({ title, refresh, content }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${refresh ? '<meta http-equiv="refresh" content="5">' : ""}<title>${esc(title)} · PHSecure</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>${STYLE}</style></head><body>
<header><div class="bar"><a class="logo" href="/api/dev/outbox" aria-label="PHSecure dev outbox">PHSecure<i></i></a><span class="caps tag">Dev outbox</span></div></header>
<main>${content}</main></body></html>`;

devRoutes.get("/status", (req, res) => res.json({ outbox: config.devOutbox }));

devRoutes.get("/outbox.json", async (req, res) => res.json({ messages: await listOutbox() }));

devRoutes.get("/outbox", async (req, res) => {
  const messages = await listOutbox();
  const rows = messages
    .map(
      (m) => `<li><a href="outbox/${esc(m.id)}">
        <span class="caps kind ${esc(m.kind)}">${esc(m.kind)}</span>
        <span class="text"><span class="subject">${esc(m.subject)}</span>
        <span class="meta">${esc(m.to)} · ${esc(new Date(m.createdAt).toLocaleString())}</span></span>
        <span class="chev" aria-hidden="true">›</span></a></li>`,
    )
    .join("");
  const count = `${messages.length} latest message${messages.length === 1 ? "" : "s"}`;
  res.type("html").send(
    page({
      title: "Dev outbox",
      refresh: true,
      content: `<h1>Outbox</h1>
<p class="lede"><span class="live"></span>${count} · Brevo isn't configured, so emails and SMS land here instead. This page refreshes every 5 seconds.</p>
<ul class="list">${rows || '<li class="empty">No messages yet.</li>'}</ul>`,
    }),
  );
});

devRoutes.get("/outbox/:id", async (req, res) => {
  const message = await readOutboxMessage(req.params.id);
  if (!message) return res.status(404).type("text").send("Message not found.");
  if (message.html) return res.type("html").send(message.html);
  res.type("html").send(
    page({
      title: "SMS",
      content: `<a class="back" href="../outbox">← All messages</a>
<div class="sms-view"><p class="meta">SMS to ${esc(message.to)} · from <strong>${esc(config.BREVO_SMS_SENDER)}</strong></p>
<div class="bubble">${esc(message.text)}</div></div>`,
    }),
  );
});
