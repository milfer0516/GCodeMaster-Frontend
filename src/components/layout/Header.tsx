import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "../../modules/auth/store/authStore";
import { logout as logoutService } from "../../modules/auth/services/authService";
import logoImage from "../../assets/landing/Logo-Dashboard-Empresa.png";
import toast from "react-hot-toast";

export function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const empresa = useAuthStore((state) => state.empresa);
  const logoutStore = useAuthStore((state) => state.logout);
  const plan_activo = useAuthStore((state) => state.plan_activo);

  const planColores: Record<string, string> = {
    demo: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    basic: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    premium: "bg-purple-500/10 text-purple-400 border-purple-500/20",
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
      {/* Agregamos w-full aquí para forzar que ocupe todo el espacio disponible */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* ===== LADO IZQUIERDO ===== */}
        <div className="flex items-center gap-3">
          {/* Quitamos el div extra que lo envolvía y aplicamos las clases directo a la imagen */}
          <img
            src={logoImage}
            alt="Logo GcodeMaster"
            className="h-16 w-20 object-contain flex-shrink-0"
          />

          {empresa && (
            <div className="flex items-center gap-3">
              <span className="text-border">|</span>
              {/* whitespace-nowrap evita que un nombre largo se salte de línea y rompa el header */}
              <p className="whitespace-nowrap text-sm font-medium text-text-primary">
                {empresa.nombre_empresa}
              </p>
            </div>
          )}
        </div>

        {/* ===== LADO DERECHO ===== */}
        <div className="flex flex-shrink-0 items-center gap-4">
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
