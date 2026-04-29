import { Link, Navigate } from "react-router-dom";
import { AuthVisualPanel } from "../components/AuthVisualPanel";
import { RegisterForm } from "../components/RegisterForm";
import { useAuthStore } from "../store/authStore";

export function RegisterPage() {
  const accessToken = useAuthStore((state) => state.access_token);
  const onboardingCompleto = useAuthStore((state) => state.onboarding_completo);
  const mfaPendiente = useAuthStore((state) => state.mfa_pendiente);

  if (accessToken) {
    if (mfaPendiente) {
      return <Navigate to="/mfa" replace />;
    }

    return <Navigate to={onboardingCompleto ? "/dashboard" : "/onboarding"} replace />;
  }

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* En 1024px se apila; el split 50/50 entra en xl para evitar un layout apretado */}
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 xl:grid-cols-2">
        <AuthVisualPanel
          title="Registra tu taller y deja tu empresa lista para el flujo CAM."
          description="Conecta tus datos, configura tu acceso y prepara el onboarding para que el sistema pueda vincular tu máquina y tu operación desde el primer ingreso."
        />

        <div className="flex items-center justify-center">
          <div className="w-full max-w-[620px] rounded-2xl border border-border bg-bg-surface p-6 shadow-soft sm:p-8">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">GCodeMaster CNC</p>
              <h1 className="mt-2 text-[28px] font-bold text-text-primary">Crear cuenta</h1>
              <p className="mt-2 text-sm text-text-muted">
                El registro crea tu empresa y deja listo el flujo para onboarding.
              </p>
            </div>

            <RegisterForm />

            <p className="mt-6 text-sm text-text-muted">
              Ya tienes cuenta?{" "}
              <Link className="text-accent-blue hover:underline" to="/login">
                Inicia sesion
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
