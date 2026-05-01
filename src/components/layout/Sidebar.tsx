// src/components/layout/Sidebar.tsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  MonitorPlay,
  Wrench,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";
//import { LayoutDashboard, FolderOpen, MonitorPlay, Wrench, History, Settings, Cpu } from "lucide-react";

// ── ITEMS DE NAVEGACIÓN ───────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { to: "/proyectos", icon: FolderOpen, label: "Proyectos" },
  { to: "/cam", icon: MonitorPlay, label: "CAM Wizard" },
  { to: "/maquinas", icon: Cpu, label: "Máquinas" }, // ← NUEVO
  { to: "/herramientas", icon: Wrench, label: "Herramientas" },
  { to: "/jobs", icon: History, label: "Historial" },
  { to: "/cuenta", icon: Settings, label: "Configuración" },
];

// ── COMPONENTE ────────────────────────────────────────────────────────────

export function Sidebar() {
  const [expandido, setExpandido] = useState(false);

  return (
    <aside
      className={`
        relative flex flex-col
        border-r border-border bg-bg-surface
        transition-all duration-300 ease-in-out
        ${expandido ? "w-52" : "w-16"}
      `}
    >
      {/* ── LOGO / MARCA ── */}
      <div className="flex h-16 items-center justify-center border-b border-border px-3">
        {expandido ? (
          <span className="whitespace-nowrap text-sm font-bold tracking-tight">
            <span className="text-text-primary">GCode</span>
            <span className="text-accent-blue">Master</span>
          </span>
        ) : (
          <Cpu className="h-6 w-6 text-accent-blue" />
        )}
      </div>

      {/* ── NAV ITEMS ── */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              group flex items-center gap-3 rounded-xl px-3 py-2.5
              text-sm font-medium transition-all duration-150
              ${expandido ? "" : "justify-center"}
              ${
                isActive
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              }
            `}
            title={!expandido ? label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {expandido && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── BOTÓN COLAPSAR / EXPANDIR ── */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="
          absolute -right-3 top-20
          flex h-6 w-6 items-center justify-center
          rounded-full border border-border bg-bg-surface
          text-text-muted shadow-sm
          transition hover:border-accent-blue hover:text-accent-blue
          z-10
        "
        aria-label={expandido ? "Colapsar menú" : "Expandir menú"}
      >
        {expandido ? (
          <ChevronLeft className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}
