import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { OnboardingGuard } from "./OnboardingGuard";
import { LandingPage } from "../modules/landing/pages/LandingPage";
import { LoginPage } from "../modules/auth/pages/LoginPage";
import { RegisterPage } from "../modules/auth/pages/RegisterPage";
import { MFAPage } from "../modules/auth/pages/MFAPage";
import { ForgotPasswordPage } from "../modules/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../modules/auth/pages/ResetPasswordPage";
import { useAuthStore } from "../modules/auth/store/authStore";
import { AppLayout } from "../components/layout/AppLayout";
import { OnboardingPage } from "../modules/onboarding/pages/OnboardingPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6 text-text-primary">
      <div className="rounded-xl border border-border bg-bg-surface p-8">
        <h1 className="text-[28px] font-bold">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">
          Modulo programado para una sesion posterior.
        </p>
      </div>
    </div>
  );
}

function RootRoute() {
  const accessToken = useAuthStore((state) => state.access_token);
  const onboardingCompleto = useAuthStore((state) => state.onboarding_completo);
  const mfaPendiente = useAuthStore((state) => state.mfa_pendiente);

  if (!accessToken) {
    return <LandingPage />;
  }

  if (mfaPendiente) {
    return <Navigate to="/mfa" replace />;
  }

  if (onboardingCompleto) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/onboarding" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/mfa" element={<MFAPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<OnboardingGuard />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route
              path="/dashboard"
              element={<PlaceholderPage title="Dashboard" />}
            />
            <Route
              path="/cam"
              element={<PlaceholderPage title="CAM Wizard" />}
            />
            <Route path="/jobs" element={<PlaceholderPage title="Jobs" />} />
            <Route
              path="/cuenta"
              element={<PlaceholderPage title="Cuenta" />}
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
