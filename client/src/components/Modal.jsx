import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Eyebrow } from "./ui.jsx";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on phones, centred dialog on larger screens. Traps focus and restores it on close.
 * `onClose` omitted (or dismissible=false) → the dialog can only be left through its own buttons.
 */
export default function Modal({ title, eyebrow, onClose, dismissible = true, children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = dismissible ? onClose : null;

  useEffect(() => {
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector("input, [data-autofocus]") ?? panelRef.current?.querySelector(FOCUSABLE);
    first?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && closeRef.current) closeRef.current();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const [head, tail] = [items[0], items.at(-1)];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-forest/55 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && closeRef.current?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92dvh] w-full animate-rise overflow-y-auto rounded-t-[30px] bg-surface shadow-lift sm:max-w-[460px] sm:rounded-[30px]"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
          <div>
            {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
            <h2 id={titleId} className="text-[24px] leading-tight font-semibold">
              {title}
            </h2>
          </div>
          {dismissible && onClose && (
            <button type="button" onClick={onClose} className="-mt-1 -mr-2 rounded-full p-2 text-muted transition-colors hover:bg-mist hover:text-ink" aria-label="Close">
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="px-6 pt-4 pb-6 sm:px-7 sm:pb-7">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
