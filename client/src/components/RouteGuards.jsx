import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner } from "./ui.jsx";

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <span className="font-display text-[28px] font-bold tracking-[-0.04em] text-forest">PHSecure</span>
        <Spinner />
      </div>
    </div>
  );
}

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
