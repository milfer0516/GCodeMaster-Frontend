import { Navigate } from "react-router-dom";
import { MFAVerifyForm } from "../components/MFAVerifyForm";
import { useAuthStore } from "../store/authStore";

export function MFAPage() {
  const accessToken = useAuthStore((state) => state.access_token);
  const onboardingCompleto = useAuthStore((state) => state.onboarding_completo);
  const mfaPendiente = useAuthStore((state) => state.mfa_pendiente);

  if (!mfaPendiente) {
    if (accessToken) {
      return (
        <Navigate
          to={onboardingCompleto ? "/dashboard" : "/onboarding"}
          replace
        />
      );
    }
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-bg-surface p-6 shadow-soft">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Verificacion MFA
          </p>
          <h1 className="mt-2 text-[28px] font-bold text-text-primary">
            Ingresa tu codigo
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Necesitamos confirmar tu identidad antes de acceder al sistema.
          </p>
        </div>
        <MFAVerifyForm />
      </section>
    </main>
  );
}
