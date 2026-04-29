import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthVisualPanel } from "../components/AuthVisualPanel";
import { resetPassword } from "../services/authService";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
    else setTokenMissing(true);
  }, [searchParams]);

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  const passwordOk = passwordRegex.test(password);
  const passwordsMatch = password === confirm;
  const canSubmit = passwordOk && passwordsMatch && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await resetPassword({
        token,
        nueva_password: password,
        confirmar_password: confirm,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch {
      setError("El enlace es inválido o ha expirado. Solicita uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <AuthVisualPanel
          title="Establece una nueva contraseña segura."
          description="Elige una contraseña robusta para proteger tu acceso al sistema CNC."
        />

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-6 shadow-soft sm:p-8">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                GCodeMaster CNC
              </p>
              <h1 className="mt-2 text-[28px] font-bold text-text-primary">
                Nueva contraseña
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Mínimo 8 caracteres, 1 mayúscula y 1 número.
              </p>
            </div>

            {tokenMissing ? (
              <div className="rounded-xl border border-border bg-bg-primary p-4">
                <p className="text-sm text-red-400">
                  Enlace inválido. Solicita uno nuevo.
                </p>
                <Link
                  to="/forgot-password"
                  className="mt-4 block text-sm text-accent-blue hover:underline"
                >
                  Solicitar nuevo enlace
                </Link>
              </div>
            ) : success ? (
              <div className="rounded-xl border border-border bg-bg-primary p-4">
                <p className="text-sm text-text-primary">
                  ✓ Contraseña actualizada exitosamente. Redirigiendo al
                  login...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                  />
                  {password.length > 0 && (
                    <p
                      className={`mt-1 text-xs ${passwordOk ? "text-green-400" : "text-red-400"}`}
                    >
                      {passwordOk
                        ? "✓ Contraseña válida"
                        : "✗ Mínimo 8 caracteres, 1 mayúscula y 1 número"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.15em] text-text-muted">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none"
                  />
                  {confirm.length > 0 && (
                    <p
                      className={`mt-1 text-xs ${passwordsMatch ? "text-green-400" : "text-red-400"}`}
                    >
                      {passwordsMatch ? "✓ Coinciden" : "✗ No coinciden"}
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="w-full rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
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
