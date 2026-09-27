import { BadgeCheck, ChevronRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { Badge, Card, PageHeader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate } from "../lib/format.js";
import { METHODS } from "../lib/methods.js";

function Row({ label, children }) {
  return (
    <div className="grid gap-1 px-6 py-4 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-6">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">{children}</dd>
    </div>
  );
}

const Verified = () => (
  <Badge tone="success">
    <BadgeCheck className="size-3.5" aria-hidden /> Verified
  </Badge>
);

export default function Profile() {
  const { user } = useAuth();
  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Profile" title="Personal details" description="To change your name or email, contact your private banker." />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-5 bg-forest px-6 py-7 text-white">
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-lime font-display text-[22px] font-semibold text-ink">
            {initials}
          </span>
          <div>
            <p className="font-display text-[22px] font-semibold">{user.fullName}</p>
            <p className="text-[13.5px] text-white/60">Client since {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <dl className="divide-y divide-line">
          <Row label="Email">
            {user.maskedEmail}
            {user.emailVerified ? <Verified /> : <Badge tone="danger">Not verified</Badge>}
          </Row>
          <Row label="Mobile">
            {user.maskedPhone ?? <span className="font-normal text-muted">Not added</span>}
            {user.maskedPhone && (user.phoneVerified ? <Verified /> : <Badge>Not verified</Badge>)}
          </Row>
          <Row label="Two-factor authentication">
            {user.twoFactorOn ? (
              <>
                <Badge tone="lime">On</Badge>
                {user.defaultMethod && <span className="text-[14px] font-normal text-muted">Default: {METHODS[user.defaultMethod].name}</span>}
              </>
            ) : (
              <Badge tone="danger">Off</Badge>
            )}
          </Row>
        </dl>
        <Link to="/security" className="flex items-center gap-3 border-t border-line px-6 py-4 text-[14px] font-semibold text-ink transition-colors hover:bg-canvas">
          <ShieldCheck className="size-4 text-forest" aria-hidden />
          <span className="flex-1">Manage your sign-in keys</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </Card>
    </div>
  );
}
