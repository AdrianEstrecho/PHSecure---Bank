import { ChevronLeft, CircleAlert, KeyRound, LogIn, LogOut, ShieldCheck, ShieldOff, UserRound } from "lucide-react";
import { Link } from "react-router";
import { banking } from "../api/endpoints.js";
import { Alert, Card, PageHeader, Spinner, cx } from "../components/ui.jsx";
import { formatDateTime } from "../lib/format.js";
import { METHODS } from "../lib/methods.js";
import { useLoad } from "../lib/useLoad.js";

const methodName = (d) => METHODS[d]?.name ?? d;

// label(details) → text, plus an icon and whether the event deserves attention.
const EVENTS = {
  ACCOUNT_CREATED: { icon: UserRound, label: (d) => (d ? `Account opened with ${d}` : "Account opened") },
  EMAIL_VERIFIED: { icon: ShieldCheck, label: () => "Email address confirmed" },
  GOOGLE_LINKED: { icon: ShieldCheck, label: () => "Google account linked for sign-in" },
  LOGIN_SUCCESS: { icon: LogIn, label: (d) => `Signed in${d ? ` · ${d}` : ""}` },
  LOGIN_FAILED: { icon: CircleAlert, warn: true, label: () => "Sign-in failed · wrong password" },
  LOGIN_2FA_FAILED: { icon: CircleAlert, warn: true, label: (d) => `Sign-in failed · wrong ${d ?? "code"}` },
  PASSWORD_CHECK_FAILED: { icon: CircleAlert, warn: true, label: (d) => `Wrong password${d ? ` · ${d}` : ""}` },
  NEW_DEVICE: { icon: LogIn, warn: true, label: (d) => `New device · ${d}` },
  LOGOUT: { icon: LogOut, label: () => "Signed out" },
  ACCOUNT_LOCKED: { icon: CircleAlert, warn: true, label: () => "Account locked after failed attempts" },
  ACCOUNT_LOCKED_BY_USER: { icon: CircleAlert, warn: true, label: () => "Account locked from email link" },
  "2FA_ENABLED": { icon: ShieldCheck, label: (d) => `${methodName(d)} turned on` },
  "2FA_DISABLED": { icon: ShieldOff, warn: true, label: (d) => `${methodName(d)} turned off` },
  "2FA_TURNED_OFF": { icon: ShieldOff, warn: true, label: () => "Two-factor authentication turned off" },
  PASSKEY_ADDED: { icon: ShieldCheck, label: (d) => `Passkey added · ${d}` },
  PHONE_VERIFIED: { icon: ShieldCheck, label: (d) => `Phone number verified · ${d}` },
  DEFAULT_METHOD_CHANGED: { icon: ShieldCheck, label: (d) => `Default method set to ${methodName(d)}` },
  VAULT_CODES_GENERATED: { icon: KeyRound, label: () => "Vault Codes created" },
  VAULT_CODE_USED: { icon: KeyRound, warn: true, label: (d) => `Vault Code used to sign in · ${d}` },
};

export default function SecurityActivity() {
  const { data, error } = useLoad(banking.securityLogs);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/security" className="mb-4 inline-flex items-center gap-1 text-[14px] text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden /> Security
      </Link>
      <PageHeader eyebrow="Security" title="Security activity" description="Sign-ins and changes to your security settings. If something here wasn't you, lock your account from any of our security emails." />

      {error && <Alert>{error}</Alert>}
      {!data && !error && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {data && (
        <Card className="overflow-hidden">
          {data.logs.length === 0 ? (
            <p className="py-10 text-center text-muted">No security activity yet.</p>
          ) : (
            <ol className="divide-y divide-line/80">
              {data.logs.map((log) => {
                const meta = EVENTS[log.event] ?? { icon: ShieldCheck, label: () => log.event };
                const Icon = meta.icon;
                return (
                  <li key={log.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <span aria-hidden className={cx("grid size-10 shrink-0 place-items-center rounded-full", meta.warn ? "bg-danger/10 text-danger" : "bg-lime-soft text-forest")}>
                      <Icon className="size-4" strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-medium text-ink">{meta.label(log.details)}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {log.device} · {log.ip}
                        <span className="sm:hidden"> · {formatDateTime(log.createdAt)}</span>
                      </p>
                    </div>
                    <time dateTime={log.createdAt} className="hidden shrink-0 text-right text-[12.5px] text-muted sm:block">
                      {formatDateTime(log.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}
