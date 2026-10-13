import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import { NeedsVersion2, useFinishSignIn } from "./finishSignIn.jsx";
import Layout from "./Layout.jsx";
import { AuthBox, Message, buttonClass } from "./ui.jsx";

/** Where the server sends the browser back after Google: #token=… to redeem once, or #error=… to show. */
export default function GoogleSignIn() {
  const finish = useFinishSignIn();
  const [params] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const [error, setError] = useState(params.get("error"));
  const [needsVersion2, setNeedsVersion2] = useState(false);
  const redeemed = useRef(false);

  useEffect(() => {
    // Keep the one-time token out of the address bar and history.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    const token = params.get("token");
    if (!token || redeemed.current) return;
    redeemed.current = true; // StrictMode runs effects twice; the token only works once.
    auth
      .googleFinish(token)
      .then((result) => setNeedsVersion2(!finish(result, { replace: true })))
      .catch((err) => setError(errorMessage(err)));
  }, [params, finish]);

  if (!error && !params.get("token")) return <Navigate to="/login" replace />;

  return (
    <Layout>
      {error || needsVersion2 ? (
        <AuthBox title="Google sign-in didn't finish">
          {needsVersion2 ? <NeedsVersion2 /> : <Message>{error}</Message>}
          <Link to="/login" className={buttonClass("primary", "mt-6 w-full")}>
            Back to sign in
          </Link>
        </AuthBox>
      ) : (
        <p role="status" className="text-center text-[14px] text-muted">
          Signing you in with Google…
        </p>
      )}
    </Layout>
  );
}
