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

  useEffect(() => {
    const saved = window.localStorage.getItem("gcodemaster-theme") as
      | "dark"
      | "light"
      | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("gcodemaster-theme", theme);
  }, [theme]);

  const themeLabel = useMemo(
    () => (theme === "dark" ? "Modo Claro" : "Modo Oscuro"),
    [theme],
  );

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
    } finally {
      logoutStore();
      toast.success("Sesión cerrada.");
      navigate("/login");
    }
  };

  return (
    <header className="w-full border-b border-border bg-bg-surface h-14 md:h-16 flex-shrink-0">
      <div className="flex h-full items-center justify-between px-3 md:px-6 max-w-full overflow-hidden">
        {/* Logo + Empresa */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <img
            src={logoImage}
            alt="Logo"
            className="h-8 md:h-10 w-auto object-contain rounded flex-shrink-0"
          />
          {empresa && (
            <>
              <span className="hidden md:inline text-border">|</span>
              <p className="hidden md:block text-sm font-medium text-text-primary truncate">
                {empresa.nombre_empresa}
              </p>
            </>
          )}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Tema */}
          <button
            type="button"
            onClick={() => setTheme((c) => (c === "dark" ? "light" : "dark"))}
            className="p-2 md:px-3 md:py-1.5 rounded-lg border border-border bg-bg-primary text-text-primary hover:border-accent-blue hover:text-accent-blue transition"
            aria-label={themeLabel}
          >
            {theme === "dark" ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
          </button>

          {/* Plan - oculto en móvil */}
          <span
            className={`hidden md:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${planColores[plan_activo] ?? planColores.demo}`}
          >
            {plan_activo}
          </span>

          {/* Usuario - solo icono en móvil */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">
              {user?.nombre_completo ?? "Usuario"}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2 md:px-3 py-1.5 text-sm text-text-muted hover:border-accent-red hover:text-accent-red transition"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
