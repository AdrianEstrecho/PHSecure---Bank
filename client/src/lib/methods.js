import { Fingerprint, KeyRound, Mail, MessageSquareText, Smartphone } from "lucide-react";

export const METHOD_ORDER = ["EMAIL", "TOTP", "SMS", "PASSKEY"];

export const METHODS = {
  EMAIL: {
    name: "PHSecure Mail Key",
    icon: Mail,
    kind: "Email code",
    describe: (s) => `Codes sent to ${s.maskedEmail}`,
  },
  TOTP: {
    name: "PHSecure Authenticator",
    icon: Smartphone,
    kind: "Authenticator app",
    describe: () => "Google Authenticator, Microsoft Authenticator, Authy or 1Password",
  },
  SMS: {
    name: "PHSecure Text Key",
    icon: MessageSquareText,
    kind: "Text message",
    describe: (s, enabled) => (enabled && s.maskedPhone ? `Codes sent to ${s.maskedPhone}` : "Add a phone number to turn this on"),
  },
  PASSKEY: {
    name: "PHSecure Touch",
    suffix: "Passkey",
    icon: Fingerprint,
    kind: "Passkey",
    describe: () => "Face ID, Touch ID, Windows Hello or a security key",
  },
};

export const VAULT = { name: "Vault Codes", icon: KeyRound };

// Phishing-resistant and app-based methods weigh more than codes sent over email or SMS.
const WEIGHTS = { EMAIL: 2, SMS: 2, TOTP: 4, PASSKEY: 5 };

/** 0–10 score plus label for the Security page meter. */
export function securityStrength(status) {
  if (!status?.twoFactorOn) return { score: 0, label: "Off" };
  const score = Math.min(
    10,
    status.methods.filter((m) => m.enabled).reduce((sum, m) => sum + WEIGHTS[m.type], 0) + (status.vault.remaining > 0 ? 1 : 0),
  );
  const label = score >= 9 ? "Excellent" : score >= 7 ? "Strong" : score >= 4 ? "Good" : "Basic";
  return { score, label };
}
