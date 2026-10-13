import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import Layout from "./Layout.jsx";
import { AuthBox, Message, buttonClass } from "./ui.jsx";

/** Where the server sends the browser back after Google. In version 1, Google is followed by the emailed code. */
export default function GoogleSignIn() {
  const navigate = useNavigate();
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
      .googleFinish(token, { emailCodeOnly: true })
      .then((challenge) => navigate("/login/verify", { replace: true, state: { challenge } }))
      .catch((err) => setError(errorMessage(err)));
  }, [params, navigate]);

  if (!error && !params.get("token")) return <Navigate to="/login" replace />;

  return (
    <Layout>
      {error ? (
        <AuthBox title="Google sign-in didn't finish">
          <Message>{error}</Message>
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
