import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { refreshSession, setAccessToken, setSessionEndedHandler } from "../api/client.js";
import { auth } from "../api/endpoints.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // endedBy: "signed-out" when the user chose to leave, so the app doesn't offer to return them to the last page.
  const [state, setState] = useState({ status: "loading", user: null, endedBy: null });

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

  /** Takes a successful sign-in response ({ accessToken, user }). */
  const signIn = useCallback(({ accessToken, user }) => {
    setAccessToken(accessToken);
    setState({ status: "authenticated", user, endedBy: null });
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout().catch(() => {});
    endSession("signed-out");
  }, [endSession]);

  const updateUser = useCallback((patch) => setState((s) => ({ ...s, user: { ...s.user, ...patch } })), []);

  const value = useMemo(() => ({ ...state, signIn, signOut, updateUser }), [state, signIn, signOut, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
