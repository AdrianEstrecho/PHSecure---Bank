import { Route, Routes } from "react-router";
import AppLayout from "./components/AppLayout.jsx";
import { PublicOnly, RequireAuth } from "./components/RouteGuards.jsx";
import { useVersion } from "./context/VersionContext.jsx";
import Accounts from "./pages/Accounts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import GoogleSignIn from "./pages/GoogleSignIn.jsx";
import Landing from "./pages/Landing.jsx";
import LockAccount from "./pages/LockAccount.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import Security from "./pages/Security.jsx";
import SecurityActivity from "./pages/SecurityActivity.jsx";
import Transfers from "./pages/Transfers.jsx";
import TwoFactorChallenge from "./pages/TwoFactorChallenge.jsx";
import UnlockAccount from "./pages/UnlockAccount.jsx";
import V1App from "./v1/V1App.jsx";

export default function App() {
  const { version } = useVersion();
  if (version === 1) return <V1App />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/lock" element={<LockAccount />} />
      <Route path="/unlock" element={<UnlockAccount />} />

      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/login/verify" element={<TwoFactorChallenge />} />
        <Route path="/login/google" element={<GoogleSignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/security" element={<Security />} />
          <Route path="/security/activity" element={<SecurityActivity />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
