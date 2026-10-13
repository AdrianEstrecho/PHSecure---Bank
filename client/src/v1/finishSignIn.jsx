import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { useVersion } from "../context/VersionContext.jsx";
import { Message } from "./ui.jsx";

/**
 * Takes the reply to a password or Google sign-in: signs in, or opens the emailed-code step when email verification
 * is on. Returns false when the account only has keys version 1 doesn't (authenticator app, text message, passkey).
 */
export function useFinishSignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  return useCallback(
    (result, { replace = false } = {}) => {
      if (!result.requires2FA) {
        signIn(result);
        navigate("/dashboard", { replace: true });
      } else if (result.methods.includes("EMAIL")) {
        navigate("/login/verify", { replace, state: { challenge: result } });
      } else {
        return false;
      }
      return true;
    },
    [navigate, signIn],
  );
}

export function NeedsVersion2() {
  const { switchTo } = useVersion();
  return (
    <Message>
      This account signs in with an authenticator app, a text message or a passkey, which only Version 2 has.{" "}
      <button type="button" onClick={() => switchTo(2)} className="font-semibold underline underline-offset-2 hover:no-underline">
        Switch to Version 2
      </button>
    </Message>
  );
}
