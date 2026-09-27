import { codeBlock, detailsTable, esc, layout, notice, paragraph, strong } from "./layout.js";

// Every template receives { firstName, context: { device, location, ip, time }, lockUrl } plus its own fields,
// and returns { subject, html, text }.

const contextRows = (context, extra = []) => [
  ["Device", context.device],
  ["Approximate location", context.location],
  ["IP address", context.ip],
  ["Time", context.time],
  ...extra,
];

const textDetails = (context, extra = []) =>
  contextRows(context, extra)
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

const LOCK_TEXT = (lockUrl) => (lockUrl ? `\nIf this wasn't you, lock your account immediately: ${lockUrl}\n` : "");

function codeEmail({ subject, heading, preheader, intro, introText, code, expiresInMinutes, expiresAtLabel, context, lockUrl }) {
  const expiryLine = `This code expires in ${expiresInMinutes} minutes (at ${expiresAtLabel}).`;
  return {
    subject,
    html: layout({
      preheader,
      heading,
      lockUrl,
      body: [paragraph(intro), codeBlock(code, expiryLine), detailsTable(contextRows(context)), paragraph("Never share this code with anyone, including PHSecure staff.")].join(""),
    }),
    text: `${heading}\n\n${introText}\n\nYour code: ${code}\n${expiryLine}\n\n${textDetails(context)}\n${LOCK_TEXT(lockUrl)}\nNever share this code with anyone, including PHSecure staff.`,
  };
}

function alertEmail({ subject, heading, preheader, paragraphs, textParagraphs, callout, context, extraRows, lockUrl }) {
  return {
    subject,
    html: layout({
      preheader,
      heading,
      lockUrl,
      body: [...paragraphs.map(paragraph), callout ?? "", detailsTable(contextRows(context, extraRows))].join(""),
    }),
    text: `${heading}\n\n${textParagraphs.join("\n\n")}\n\n${textDetails(context, extraRows)}\n${LOCK_TEXT(lockUrl)}`,
  };
}

export const templates = {
  "verify-email": (d) =>
    codeEmail({
      ...d,
      subject: "Verify your email for PHSecure",
      heading: "Verify your email",
      preheader: `Your verification code is ${d.code}`,
      intro: `Welcome to PHSecure Bank, ${esc(d.firstName)}. Enter this code to confirm your email address and finish opening your account.`,
      introText: `Welcome to PHSecure Bank, ${d.firstName}. Enter this code to confirm your email address.`,
    }),

  "verify-enable-2fa": (d) =>
    codeEmail({
      ...d,
      subject: `Confirm you want to turn on ${d.methodName}`,
      heading: "Confirm this security change",
      preheader: `Your code to turn on ${d.methodName}`,
      intro: `You asked to turn on ${strong(d.methodName)} for your PHSecure account. Enter this code to continue.`,
      introText: `You asked to turn on ${d.methodName} for your PHSecure account. Enter this code to continue.`,
    }),

  "verify-disable-2fa": (d) =>
    codeEmail({
      ...d,
      subject: `Confirm you want to turn off ${d.methodName}`,
      heading: "Confirm this security change",
      preheader: `Your code to turn off ${d.methodName}`,
      intro:
        `You asked to turn off ${strong(d.methodName)}. Enter this code to confirm.` +
        (d.isLastMethod ? " This is your last security method, so two-factor authentication will be turned off entirely." : ""),
      introText:
        `You asked to turn off ${d.methodName}. Enter this code to confirm.` +
        (d.isLastMethod ? " This is your last security method, so two-factor authentication will be turned off entirely." : ""),
    }),

  "login-otp": (d) =>
    codeEmail({
      ...d,
      subject: "Your PHSecure sign-in code",
      heading: "Your sign-in code",
      preheader: `${d.code} is your PHSecure sign-in code`,
      intro: "Use this code to finish signing in to your PHSecure account.",
      introText: "Use this code to finish signing in to your PHSecure account.",
    }),

  "vault-regenerate-code": (d) =>
    codeEmail({
      ...d,
      subject: "Confirm new Vault Codes",
      heading: "Confirm new Vault Codes",
      preheader: "Your code to create new Vault Codes",
      intro: "You asked to create a new set of Vault Codes. Once you confirm, your current codes stop working.",
      introText: "You asked to create a new set of Vault Codes. Once you confirm, your current codes stop working.",
    }),

  "2fa-enabled": (d) =>
    alertEmail({
      ...d,
      subject: `${d.methodName} is now on`,
      heading: "A security method was turned on",
      preheader: `${d.methodName} now protects your account`,
      paragraphs: [`${strong(d.methodName)} now protects your PHSecure account. We'll ask for it when you sign in.`],
      textParagraphs: [`${d.methodName} now protects your PHSecure account. We'll ask for it when you sign in.`],
      extraRows: [["Method", d.methodName]],
    }),

  "2fa-disabled-alert": (d) =>
    alertEmail({
      ...d,
      subject: "A security method was turned off",
      heading: "A security method was turned off",
      preheader: `${d.methodName} was turned off`,
      paragraphs: [`${strong(d.methodName)} was turned off for your PHSecure account.`],
      textParagraphs: [
        `${d.methodName} was turned off for your PHSecure account.`,
        ...(d.fullyOff ? ["Two-factor authentication is now off. Your account is protected by your password alone."] : []),
      ],
      callout: d.fullyOff
        ? notice(`${strong("Two-factor authentication is now off.")} Your account is protected by your password alone. We recommend turning a method back on.`, "danger")
        : null,
      extraRows: [["Method", d.methodName]],
    }),

  "new-device-alert": (d) =>
    alertEmail({
      ...d,
      subject: "New sign-in to your account",
      heading: "New sign-in to your account",
      preheader: `Signed in from ${d.context.device}`,
      paragraphs: ["We noticed a sign-in to your PHSecure account from a device we haven't seen before. If this was you, there's nothing else to do."],
      textParagraphs: ["We noticed a sign-in to your PHSecure account from a device we haven't seen before. If this was you, there's nothing else to do."],
      extraRows: [["Verified with", d.verifiedWith]],
    }),

  "vault-codes-generated": (d) =>
    alertEmail({
      ...d,
      subject: "Your recovery codes were created",
      heading: "Your recovery codes were created",
      preheader: "A new set of 10 Vault Codes was created",
      paragraphs: [
        `A new set of ${strong("10 Vault Codes")} was created for your account. Any earlier codes no longer work.`,
        "For your safety we never send the codes themselves by email. Keep the copy you saved somewhere only you can reach.",
      ],
      textParagraphs: [
        "A new set of 10 Vault Codes was created for your account. Any earlier codes no longer work.",
        "For your safety we never send the codes themselves by email. Keep the copy you saved somewhere only you can reach.",
      ],
    }),

  "vault-code-used": (d) =>
    alertEmail({
      ...d,
      subject: "A Vault Code was used to sign in",
      heading: "A Vault Code was used",
      preheader: `${d.remaining} Vault Codes remaining`,
      paragraphs: [
        `One of your Vault Codes was just used to sign in. You have ${strong(`${d.remaining} of 10`)} codes left.`,
        "If you've lost access to your other security methods, sign in and set them up again from Profile → Security.",
      ],
      textParagraphs: [
        `One of your Vault Codes was just used to sign in. You have ${d.remaining} of 10 codes left.`,
        "If you've lost access to your other security methods, sign in and set them up again from Profile → Security.",
      ],
    }),

  "account-locked": (d) =>
    alertEmail({
      ...d,
      subject: "Your PHSecure account is locked",
      heading: "Your account is temporarily locked",
      preheader: d.byUser ? "Locked at your request" : "Locked after repeated failed attempts",
      paragraphs: d.byUser
        ? [`Your account was locked at your request. Every device has been signed out, and sign-in is blocked until ${esc(d.until)}.`]
        : [`After 5 unsuccessful sign-in attempts we locked your account until ${strong(d.until)} to keep it safe.`, "If these attempts weren't you, change your password as soon as you can sign in."],
      textParagraphs: d.byUser
        ? [`Your account was locked at your request. Every device has been signed out, and sign-in is blocked until ${d.until}.`]
        : [`After 5 unsuccessful sign-in attempts we locked your account until ${d.until} to keep it safe.`, "If these attempts weren't you, change your password as soon as you can sign in."],
    }),
};
