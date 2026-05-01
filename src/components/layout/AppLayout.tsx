// src/components/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Header ocupa todo el ancho arriba */}
      <Header />

      {/* Sidebar + contenido debajo del header */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
