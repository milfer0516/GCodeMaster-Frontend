import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../modules/auth/store/authStore";

export function ProtectedRoute() {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.access_token);
  const mfaPendiente = useAuthStore((state) => state.mfa_pendiente);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (mfaPendiente) {
    return <Navigate to="/mfa" replace />;
  }

  return <Outlet />;
}
