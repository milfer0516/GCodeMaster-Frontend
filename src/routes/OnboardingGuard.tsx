import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../modules/auth/store/authStore";

export function OnboardingGuard() {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.access_token);
  const onboardingCompleto = useAuthStore((state) => state.onboarding_completo);
  const mfaPendiente = useAuthStore((state) => state.mfa_pendiente);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (mfaPendiente) {
    return <Navigate to="/mfa" replace />;
  }

  const isOnboardingRoute = location.pathname === "/onboarding";

  if (!onboardingCompleto && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (onboardingCompleto && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
