import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import { Alert, ButtonLink, Spinner } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/** Where the server sends the browser back after Google: #token=… to redeem once, or #error=… to show. */
export default function GoogleSignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [params] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const [error, setError] = useState(params.get("error"));
  const redeemed = useRef(false);

  useEffect(() => {
    // Keep the one-time token out of the address bar and history.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    const token = params.get("token");
    if (!token || redeemed.current) return;
    redeemed.current = true; // StrictMode runs effects twice; the token only works once.
    auth
      .googleFinish(token)
      .then((result) => {
        if (result.requires2FA) navigate("/login/verify", { replace: true, state: { challenge: result, from: "/dashboard" } });
        else {
          signIn(result);
          navigate("/dashboard", { replace: true });
        }
      })
      .catch((err) => setError(errorMessage(err)));
  }, [params, navigate, signIn]);

  if (!error && !params.get("token")) return <Navigate to="/login" replace />;

  return (
    <AuthShell>
      {error ? (
        <>
          <h1 className="text-[30px] leading-tight font-semibold">Google sign-in didn't finish</h1>
          <Alert className="mt-6">{error}</Alert>
          <ButtonLink to="/login" className="mt-6 w-full" size="lg">
            Back to sign in
          </ButtonLink>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-10 text-center" aria-live="polite">
          <Spinner />
          <p className="text-[15px] text-muted">Signing you in with Google…</p>
        </div>
      )}
    </AuthShell>
  );
}
