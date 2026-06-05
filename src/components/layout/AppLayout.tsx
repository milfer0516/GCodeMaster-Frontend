import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/proyectos": "Proyectos",
  "/cam": "CAM Wizard",
  "/maquinas": "Máquinas",
  "/herramientas": "Herramientas",
  "/jobs": "Historial",
  "/cuenta": "Configuración",
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] || "Dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary overflow-x-hidden">
      <Header />

      {/* Barra superior móvil - debajo del header */}
      <div className="md:hidden sticky top-0 z-20 flex items-center justify-between h-12 px-3 border-b border-border bg-bg-surface">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-bg-elevated rounded-lg transition"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </button>
        <h1 className="text-sm font-semibold text-text-primary">{pageTitle}</h1>
        <div className="w-9"></div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}

      {/* Contenedor sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto w-full px-3 py-3 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
