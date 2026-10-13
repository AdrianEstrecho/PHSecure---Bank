import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

const VersionContext = createContext(null);

const STORAGE_KEY = "phsecure-version";

// Version 2 is the full site. Version 1 is the early build: simple pages, and an emailed code as the only second step.
function savedVersion() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1" ? 1 : 2;
  } catch {
    return 2;
  }
}

export function VersionProvider({ children }) {
  const [version, setVersion] = useState(savedVersion);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const switchTo = useCallback(
    (next) => {
      if (next === version) return;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Private windows can refuse storage; the switch still holds until the page reloads.
      }
      setVersion(next);
      // A sign-in that's under way (/login/verify, /login/google) belongs to the version it started in.
      if (pathname.startsWith("/login/")) navigate("/login", { replace: true });
      window.scrollTo(0, 0);
    },
    [version, pathname, navigate],
  );

  const value = useMemo(() => ({ version, switchTo }), [version, switchTo]);
  return <VersionContext.Provider value={value}>{children}</VersionContext.Provider>;
}

export const useVersion = () => useContext(VersionContext);
