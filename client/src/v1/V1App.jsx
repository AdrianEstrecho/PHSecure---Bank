import { Navigate, Route, Routes } from "react-router";
import { PublicOnly, RequireAuth } from "../components/RouteGuards.jsx";
import LockAccount from "../pages/LockAccount.jsx";
import UnlockAccount from "../pages/UnlockAccount.jsx";
import Dashboard from "./Dashboard.jsx";
import GoogleSignIn from "./GoogleSignIn.jsx";
import Landing from "./Landing.jsx";
import Login from "./Login.jsx";
import LoginVerify from "./LoginVerify.jsx";
import Register from "./Register.jsx";

/** Version 1, the early build: sign-in by password or Google, an emailed code as the only check, and a dashboard. */
export default function V1App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* Security emails link to these, so they work in either version. */}
      <Route path="/lock" element={<LockAccount />} />
      <Route path="/unlock" element={<UnlockAccount />} />

      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/login/verify" element={<LoginVerify />} />
        <Route path="/login/google" element={<GoogleSignIn />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Pages only version 2 has (Accounts, Transfers, Security, …) fall back to the dashboard, or to sign-in. */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
