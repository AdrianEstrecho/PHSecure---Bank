import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import FullScreenLoader from "./FullScreenLoader.jsx";

export function RequireAuth() {
  const { status, endedBy } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "anonymous") return <Navigate to="/login" replace state={endedBy === "signed-out" ? null : { from: location.pathname + location.search }} />;
  return <Outlet />;
}

export function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "authenticated") return <Navigate to={location.state?.from ?? "/dashboard"} replace />;
  return <Outlet />;
}
