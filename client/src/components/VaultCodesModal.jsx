import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { formatDateTime } from "../lib/format.js";
import { Alert, Button } from "./ui.jsx";

function downloadCodes(codes) {
  const body = [
    "PHSecure Bank — Vault Codes",
    `Created ${formatDateTime(new Date())}`,
    "",
    ...codes,
    "",
    "Each code works once. Use one to sign in if you lose access to your other security methods.",
    "Keep this file somewhere only you can reach.",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "phsecure-vault-codes.txt" });
  link.click();
  URL.revokeObjectURL(url);
}

/** Body of the "Save your Vault Codes" step. The codes are never shown again after `onDone`. */
export default function VaultCodesPanel({ codes, onDone }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-muted">
        If you ever lose access to your other methods, each of these codes signs you in once. <strong className="font-semibold text-ink">This is the only time we'll show them.</strong>
      </p>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-dashed border-ink/30 bg-white px-5 py-4" aria-label="Vault Codes">
        {codes.map((code) => (
          <li key={code} className="text-center font-mono text-[16px] tracking-[0.08em] text-ink tabular">
            {code}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => downloadCodes(codes)}>
          <Download className="size-4" aria-hidden /> Download
        </Button>
        <Button variant="outline" onClick={copy}>
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy codes"}
        </Button>
      </div>

      <Alert tone="info">Store them in a password manager or print them. Don't keep them in your email.</Alert>

      <label className="flex cursor-pointer items-start gap-3 text-[14px] text-ink">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 size-4 accent-forest" />
        I've saved my Vault Codes somewhere safe
      </label>

      <Button className="w-full" disabled={!saved} onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
