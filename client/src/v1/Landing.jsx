import { Link } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "./Layout.jsx";
import { Box, buttonClass } from "./ui.jsx";

const FEATURES = [
  ["Two accounts", "A current account and a savings account, opened as soon as you confirm your email."],
  ["Your transactions", "See your latest deposits and payments in one list, with the date and amount."],
  ["Email verification", "Every time you sign in, we email you a 6-digit code. Your password alone isn't enough."],
];

export default function Landing() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <Layout>
      <section className="py-4 sm:py-8">
        <h1 className="text-[30px] leading-tight font-bold sm:text-[38px]">Online banking, made simple.</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          Open an account, check your balances and see your transactions from anywhere. Each sign-in is confirmed with a code sent to your email.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {signedIn ? (
            <Link to="/dashboard" className={buttonClass("primary")}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className={buttonClass("primary")}>
                Open an account
              </Link>
              <Link to="/login" className={buttonClass("secondary")}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(([title, body]) => (
          <Box key={title} className="p-5">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
          </Box>
        ))}
      </section>
    </Layout>
  );
}
