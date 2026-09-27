import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { refreshSession, setAccessToken, setSessionEndedHandler } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import FullScreenLoader from "../components/FullScreenLoader.jsx";

const AuthContext = createContext(null);

// The "Signing you in/out…" screen stays up at least this long, so it reads as a transition rather than a flicker.
const TRANSITION_MIN_MS = 800;
const TRANSITION_MESSAGES = { in: "Signing you in…", out: "Signing you out…" };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }) {
  // endedBy: "signed-out" when the user chose to leave, so the app doesn't offer to return them to the last page.
  const [state, setState] = useState({ status: "loading", user: null, endedBy: null });
  const [transition, setTransition] = useState(null);
  const transitionRun = useRef(0);

  const endSession = useCallback((endedBy = "expired") => {
    setAccessToken(null);
    setState({ status: "anonymous", user: null, endedBy });
  }, []);

  useEffect(() => {
    setSessionEndedHandler(() => endSession("expired"));
    refreshSession()
      .then(({ user }) => setState({ status: "authenticated", user, endedBy: null }))
      .catch(() => endSession(null));
  }, [endSession]);

  /** Covers the app with the sign-in/out screen while `task` runs, and for at least TRANSITION_MIN_MS. */
  const withTransition = useCallback(async (kind, task) => {
    const run = ++transitionRun.current;
    setTransition(kind);
    try {
      await Promise.all([task?.(), pause(TRANSITION_MIN_MS)]);
    } finally {
      if (transitionRun.current === run) setTransition(null);
    }
  }, []);

  /** Takes a successful sign-in response ({ accessToken, user }); the app opens behind the "Signing you in…" screen. */
  const signIn = useCallback(
    ({ accessToken, user }) => {
      setAccessToken(accessToken);
      setState({ status: "authenticated", user, endedBy: null });
      withTransition("in");
    },
    [withTransition],
  );

  const signOut = useCallback(
    () =>
      withTransition("out", async () => {
        await auth.logout().catch(() => {});
        endSession("signed-out");
      }),
    [withTransition, endSession],
  );

  const updateUser = useCallback((patch) => setState((s) => ({ ...s, user: { ...s.user, ...patch } })), []);

  const value = useMemo(() => ({ ...state, signIn, signOut, updateUser }), [state, signIn, signOut, updateUser]);
  return (
    <AuthContext.Provider value={value}>
      {children}
      {transition && <FullScreenLoader overlay message={TRANSITION_MESSAGES[transition]} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
