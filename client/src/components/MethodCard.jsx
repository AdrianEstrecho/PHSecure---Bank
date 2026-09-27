import { Plus } from "lucide-react";
import { formatDate, timeAgo } from "../lib/format.js";
import { METHODS } from "../lib/methods.js";
import { Badge, IconCircle, Toggle } from "./ui.jsx";

/** One sign-in key: what it is, whether it's on, and a switch that starts the verified flow. */
export default function MethodCard({ state, status, onToggle, onAddPasskey }) {
  const meta = METHODS[state.type];
  const isDefault = status.defaultMethod === state.type && state.enabled;

  return (
    <li className="flex gap-4 rounded-[26px] bg-surface p-5 shadow-soft sm:gap-5 sm:p-6">
      <IconCircle icon={meta.icon} tone={state.enabled ? "lime" : "mist"} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[17px] leading-tight font-semibold">
            {meta.name}
            {meta.suffix && <span className="ml-1.5 font-sans text-[13px] font-normal text-muted">({meta.suffix})</span>}
          </h3>
          {isDefault && <Badge tone="lime">Default</Badge>}
        </div>
        <p className="mt-1 text-[14px] text-muted">{meta.describe(status, state.enabled)}</p>
        <p className="mt-2 text-[12.5px] text-muted">
          {state.enabled ? (
            <>
              <span className="font-semibold text-success">On</span> since {formatDate(state.enabledAt)}
              {state.lastUsedAt && <> · last used {timeAgo(state.lastUsedAt)}</>}
            </>
          ) : (
            "Off"
          )}
        </p>

        {state.type === "PASSKEY" && state.enabled && state.passkeys?.length > 0 && (
          <ul className="mt-4 space-y-2">
            {state.passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-2xl bg-canvas px-3.5 py-2.5 text-[13px]">
                <span className="font-medium">{p.deviceName}</span>
                <span className="text-muted">added {formatDate(p.createdAt)}</span>
              </li>
            ))}
            <li>
              <button type="button" onClick={onAddPasskey} className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-[13px] font-semibold text-forest hover:text-ink">
                <Plus className="size-3.5" aria-hidden /> Add another passkey
              </button>
            </li>
          </ul>
        )}
      </div>

      <div className="pt-1">
        <Toggle checked={state.enabled} onClick={onToggle} label={`${meta.name}: ${state.enabled ? "on — turn off" : "off — turn on"}`} />
      </div>
    </li>
  );
}
