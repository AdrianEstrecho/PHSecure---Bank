import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { auth } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import CodeForm from "./CodeForm.jsx";
import Layout from "./Layout.jsx";
import { AuthBox, TextLink } from "./ui.jsx";

/** The second step of a version 1 sign-in when email verification is on: the emailed code. */
export default function LoginVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const challenge = location.state?.challenge;

  if (!challenge) return <Navigate to="/login" replace />;
  const { challengeToken, maskedEmail } = challenge;

  return (
    <Layout>
      <AuthBox
        title="Check your email"
        intro={
          <>
            Enter the 6-digit code we emailed to <strong className="text-ink">{maskedEmail}</strong> to finish signing in.
          </>
        }
      >
        <CodeForm
          send={() => auth.send2fa(challengeToken, "EMAIL")}
          verify={(code) => auth.verify2fa({ challengeToken, method: "EMAIL", code })}
          onVerified={(session) => {
            signIn(session);
            navigate("/dashboard", { replace: true });
          }}
          submitLabel="Verify and sign in"
        />
        <p className="mt-6 text-[13.5px]">
          <TextLink as={Link} to="/login">
            Back to sign in
          </TextLink>
        </p>
      </AuthBox>
    </Layout>
  );
}
