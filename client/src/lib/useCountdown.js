import { useCallback, useEffect, useState } from "react";

/** Seconds remaining until `restart(n)` counts down to 0. Used for "Resend in 42s". */
export function useCountdown(initial = 0) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + initial * 1000);
  const [left, setLeft] = useState(initial);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  const restart = useCallback((seconds) => setEndsAt(Date.now() + seconds * 1000), []);
  return [left, restart];
}

export const formatSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
