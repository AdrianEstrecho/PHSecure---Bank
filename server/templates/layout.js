// Email-safe building blocks: tables, inline styles, web-safe font fallbacks.
// Palette mirrors the client's brand tokens (client/src/index.css): deep forest with a lime accent on soft grey-green.

const C = {
  forest: "#0E3B2A",
  forestText: "#1D6447",
  lime: "#C6F135",
  limeSoft: "#EEFAC8",
  ink: "#0F1A14",
  muted: "#5F6862",
  canvas: "#F5F6F1",
  line: "#E2E5DE",
  danger: "#C93A31",
  dangerSoft: "#FCEFEE",
  white: "#FFFFFF",
};
const DISPLAY = "Sora, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'IBM Plex Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";
const FONTS = "https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap";

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const paragraph = (html) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.ink};">${html}</p>`;

export const strong = (text) => `<strong style="font-weight:600;">${esc(text)}</strong>`;

export function codeBlock(code, expiryLine) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 10px;">
  <tr><td align="center" style="background:${C.limeSoft};border-radius:16px;padding:22px 12px;">
    <div style="font-family:${MONO};font-size:34px;font-weight:500;letter-spacing:12px;padding-left:12px;color:${C.forest};">${esc(code)}</div>
  </td></tr>
</table>
<p style="margin:0 0 24px;text-align:center;font-family:${SANS};font-size:13px;color:${C.muted};">${esc(expiryLine)}</p>`;
}

export function detailsTable(rows) {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
  <tr>
    <td style="padding:10px 0;border-top:1px solid ${C.line};font-family:${SANS};font-size:13px;color:${C.muted};width:40%;vertical-align:top;">${esc(label)}</td>
    <td style="padding:10px 0;border-top:1px solid ${C.line};font-family:${SANS};font-size:13px;color:${C.ink};vertical-align:top;">${esc(value)}</td>
  </tr>`,
    )
    .join("");
  return `
<p style="margin:8px 0 4px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${C.forestText};">Request details</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-bottom:1px solid ${C.line};">${cells}</table>`;
}

export function notice(html, tone = "brand") {
  const [accent, fill] = tone === "danger" ? [C.danger, C.dangerSoft] : [C.forest, C.canvas];
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  <tr><td style="background:${fill};border-left:3px solid ${accent};border-radius:0 12px 12px 0;padding:14px 16px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.ink};">${html}</td></tr>
</table>`;
}

function lockNotice(lockUrl) {
  return notice(
    `${strong("If this wasn't you, lock your account immediately.")}<br>
     <a href="${esc(lockUrl)}" style="color:${C.danger};font-weight:600;text-decoration:underline;">Lock my account</a>
     <span style="color:${C.muted};"> — this signs out every device and blocks sign-in for 24 hours.</span>`,
    "danger",
  );
}

// The wordmark matches the app's logo: "PHSecure" closed by a lime dot.
const WORDMARK = `<span style="font-family:${DISPLAY};font-size:26px;font-weight:700;letter-spacing:-0.04em;line-height:1;color:${C.white};">PHSecure<span style="display:inline-block;width:5px;height:5px;margin-left:2px;border-radius:50%;background:${C.lime};"></span></span>`;

export function layout({ preheader, heading, body, lockUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<link href="${FONTS}" rel="stylesheet">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.white};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">
      <tr><td style="background:${C.forest};padding:26px 32px;">${WORDMARK}</td></tr>
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${C.lime};">&nbsp;</td></tr>
      <tr><td style="padding:36px 32px 12px;">
        <h1 style="margin:0 0 18px;font-family:${DISPLAY};font-size:26px;font-weight:600;letter-spacing:-0.025em;line-height:1.2;color:${C.ink};">${esc(heading)}</h1>
        ${body}
        ${lockUrl ? lockNotice(lockUrl) : ""}
      </td></tr>
      <tr><td style="padding:0 32px 30px;">
        <p style="margin:0;padding-top:18px;border-top:1px solid ${C.line};font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
          PHSecure will never ask for your password, sign-in codes or Vault Codes — not by phone, email or chat.
        </p>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:${SANS};font-size:12px;color:${C.muted};">PHSecure Bank · Wealth, secured.</p>
  </td></tr>
</table>
</body>
</html>`;
}
