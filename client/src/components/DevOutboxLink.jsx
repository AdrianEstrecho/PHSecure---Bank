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
      className="fixed right-4 bottom-4 z-[60] inline-flex items-center gap-2 rounded-full border border-lime/60 bg-forest px-3.5 py-2 text-[12px] font-medium text-lime shadow-lift hover:bg-forest-3"
    >
      <Inbox className="size-3.5" aria-hidden /> Dev outbox
    </a>
  );
}
