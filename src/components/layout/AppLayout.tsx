// src/components/layout/AppLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Header ocupa todo el ancho arriba */}
      <Header />

      {/* Botón hamburguesa - solo móvil */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-20 left-4 z-50 p-2.5 bg-bg-surface border border-border rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6 text-text-primary" />
      </button>

      {/* Overlay - solo móvil cuando sidebar abierto */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}

      {/* Sidebar + contenido debajo del header */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
