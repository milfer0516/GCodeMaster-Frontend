import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, SunMedium, MoonStar } from "lucide-react";
import { useAuthStore } from "../../modules/auth/store/authStore";
import { logout as logoutService } from "../../modules/auth/services/authService";
import logoImage from "../../assets/landing/Imagen-Logo-Dahsboard-2.png";
import toast from "react-hot-toast";

export function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const empresa = useAuthStore((state) => state.empresa);
  const logoutStore = useAuthStore((state) => state.logout);
  const plan_activo = useAuthStore((state) => state.plan_activo);

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sincroniza tema con localStorage al montar
  useEffect(() => {
    const saved = window.localStorage.getItem("gcodemaster-theme") as
      | "dark"
      | "light"
      | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  // Aplica tema al cambiar
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("gcodemaster-theme", theme);
  }, [theme]);

  const themeLabel = useMemo(
    () => (theme === "dark" ? "Modo Claro" : "Modo Oscuro"),
    [theme],
  );

  // DESPUÉS — colores adaptivos dark/light
  const planColores: Record<string, string> = {
    demo: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30 dark:text-yellow-400 dark:border-yellow-500/20",
    basic:
      "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400 dark:border-blue-500/20",
    premium:
      "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400 dark:border-purple-500/20",
  };

  const handleLogout = async () => {
    try {
      await logoutService();
    } catch {
      // Si falla el endpoint igual hacemos logout local
    } finally {
      logoutStore();
      toast.success("Sesión cerrada.");
      navigate("/login");
    }
  };

  return (
    <header className="w-full border-b border-border bg-bg-surface">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* ── LADO IZQUIERDO ── */}
        <div className="flex items-center gap-3">
          <img
            src={logoImage}
            alt="Logo GcodeMaster"
            className="h-14 w-auto object-contain rounded-lg fill-black dark:fill-white"
          />
          {empresa && (
            <div className="flex items-center gap-3">
              <span className="text-border">|</span>
              <p className="whitespace-nowrap text-sm font-medium text-text-primary">
                {empresa.nombre_empresa}
              </p>
            </div>
          )}
        </div>

        {/* ── LADO DERECHO ── */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {/* Toggle tema */}
          <button
            type="button"
            onClick={() => setTheme((c) => (c === "dark" ? "light" : "dark"))}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary shadow-sm transition hover:border-accent-blue hover:text-accent-blue dark:shadow-none"
            aria-label={themeLabel}
          >
            {theme === "dark" ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>

          {/* Badge plan */}
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${planColores[plan_activo] ?? planColores.demo}`}
          >
            {plan_activo}
          </span>

          {/* Usuario */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <User className="h-4 w-4" />
            <span className="whitespace-nowrap">
              {user?.nombre_completo ?? "Usuario"}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition hover:border-accent-red hover:text-accent-red"
          >
            <LogOut className="h-4 w-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
