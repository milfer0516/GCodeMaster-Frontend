import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary overflow-x-hidden">
      <Header />

      {/* Botón hamburguesa */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-16 left-3 z-50 p-2 bg-bg-surface border border-border rounded-lg shadow-lg"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5 text-text-primary" />
      </button>

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

        {/* Main content - 100% ancho en móvil, respeta sidebar en desktop */}
        <main className="flex-1 overflow-y-auto w-full px-3 py-3 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
