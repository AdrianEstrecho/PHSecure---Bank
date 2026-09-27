import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../api/client.js";

/** Runs `loader` on mount (and on `reload()`), tracking data/error. `setData` lets callers apply fresher server state. */
export function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(() => {
    setError(null);
    return loader()
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading: !data && !error, reload, setData };
}
