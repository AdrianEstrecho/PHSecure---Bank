import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { dev } from "../api/endpoints.js";

/** Development only: shortcut to the server's dev outbox when Brevo isn't configured. */
export default function DevOutboxLink() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    dev.status().then((s) => setActive(s.outbox)).catch(() => setActive(false));
  }, []);

  if (!active) return null;
  return (
    <a
      href="/api/dev/outbox"
      target="_blank"
      rel="noreferrer"
      aria-label="Dev outbox"
      // Icon-only and raised clear of the app's tab bar below lg.
      className="fixed right-4 bottom-24 z-[60] inline-flex items-center gap-2 rounded-full border border-lime/60 bg-forest p-2.5 text-[12px] font-medium text-lime shadow-lift hover:bg-forest-3 sm:px-3.5 sm:py-2 lg:bottom-4"
    >
      <Inbox className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Dev outbox</span>
    </a>
  );
}
