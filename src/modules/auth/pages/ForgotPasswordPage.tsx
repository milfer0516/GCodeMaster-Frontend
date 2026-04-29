import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthVisualPanel } from "../components/AuthVisualPanel";
import { forgotPassword } from "../services/authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch {
      setError("Error al procesar la solicitud. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <AuthVisualPanel
          title="Recupera el acceso a tu entorno CNC."
          description="Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
        />

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-6 shadow-soft sm:p-8">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                GCodeMaster CNC
              </p>
              <h1 className="mt-2 text-[28px] font-bold text-text-primary">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Te enviaremos un enlace para restablecerla.
              </p>
            </div>

            {sent ? (
              <div className="rounded-xl border border-border bg-bg-primary p-4">
                <p className="text-sm text-text-primary">
                  Si el correo está registrado, recibirás un enlace en los
                  próximos minutos. Revisa también tu carpeta de spam.
                </p>
                <Link
                  to="/login"
                  className="mt-4 block text-sm text-accent-blue hover:underline"
                >
                  ← Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>

                <p className="text-sm text-text-muted">
                  <Link
                    to="/login"
                    className="text-accent-blue hover:underline"
                  >
                    ← Volver al inicio de sesión
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
