import { LogOut, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { security } from "../api/endpoints.js";
import { formatDate, timeAgo } from "../lib/format.js";
import Modal from "./Modal.jsx";
import { Alert, Badge, Button, Card, Spinner, cx } from "./ui.jsx";

const isPhone = (label) => / on (iOS|Android)$/.test(label);
const devicesText = (n) => (n === 1 ? "1 other device" : `${n} other devices`);

/** Every device signed in to the account, each with its own sign-out, plus one for all but this device. */
export default function SignedInDevices({ load }) {
  const { data, error, setData, reload } = load;
  const [busy, setBusy] = useState(null); // a device id, or "others"
  const [notice, setNotice] = useState(null); // { tone, text }
  const [confirming, setConfirming] = useState(false);

  async function run(key, action, done) {
    setBusy(key);
    setNotice(null);
    try {
      const result = await action();
      setData(result);
      setNotice({ tone: "success", text: done(result) });
    } catch (err) {
      setNotice({ tone: "danger", text: errorMessage(err) });
      reload();
    } finally {
      setBusy(null);
    }
  }

  const signOut = (device) => run(device.id, () => security.signOutDevice(device.id), () => `Signed out ${device.label}.`);
  const signOutOthers = async () => {
    await run("others", security.signOutOtherDevices, (r) => `Signed out ${devicesText(r.signedOut)}.`);
    setConfirming(false);
  };

  const devices = data?.devices ?? [];
  const others = devices.filter((d) => !d.current);

  return (
    <Card as="section" aria-labelledby="devices-heading" className="mt-3 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 id="devices-heading" className="text-[17px] font-semibold">
            Signed-in devices
          </h3>
          <p className="mt-1 text-[14px] text-muted">Don't recognise one? Sign it out, then change your password.</p>
        </div>
        {others.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={busy !== null} className="self-start sm:self-center">
            <LogOut className="size-3.5" aria-hidden /> Sign out everywhere else
          </Button>
        )}
      </div>

      {(error || notice) && (
        <div className="px-5 pb-4 sm:px-6">
          <Alert tone={error ? "danger" : notice.tone}>{error ?? notice.text}</Alert>
        </div>
      )}

      {!data && !error && (
        <div className="flex justify-center pb-8">
          <Spinner />
        </div>
      )}

      {data && (
        <ul className="divide-y divide-line/80 border-t border-line/80">
          {devices.map((device) => {
            const Icon = isPhone(device.label) ? Smartphone : Monitor;
            return (
              // On phones the Sign out button sits under the details rather than squeezing them.
              <li key={device.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <span aria-hidden className={cx("grid size-10 shrink-0 place-items-center rounded-full", device.current ? "bg-lime text-ink" : "bg-mist text-muted")}>
                  <Icon className="size-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-medium text-ink">
                    {device.label}
                    {device.current && <Badge tone="lime">This device</Badge>}
                  </p>
                  <p className="mt-0.5 text-[12.5px] break-words text-muted">
                    {device.current ? "Active now" : `Active ${timeAgo(device.lastActiveAt)}`} · {device.ip}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    Signed in {formatDate(device.signedInAt)}
                    {device.trustedUntil && <> · trusted until {formatDate(device.trustedUntil)}</>}
                  </p>
                </div>
                {!device.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut(device)}
                    loading={busy === device.id}
                    disabled={busy !== null}
                    className="col-start-2 justify-self-start border-line hover:border-ink sm:col-start-3"
                  >
                    Sign out<span className="sr-only"> {device.label}</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {confirming && (
        <Modal title="Sign out everywhere else?" onClose={() => setConfirming(false)}>
          <p className="text-[15px] leading-relaxed text-muted">
            We'll sign out {devicesText(others.length)} and stop trusting them. You'll stay signed in here. Signing back in on them will need your password — and two-factor
            authentication, if it's on.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setConfirming(false)} data-autofocus>
              Cancel
            </Button>
            <Button onClick={signOutOthers} loading={busy === "others"}>
              Sign out
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}
