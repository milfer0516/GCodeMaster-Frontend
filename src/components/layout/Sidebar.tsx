import { useState } from "react";
import { NavLink } from "react-router-dom";
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
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { to: "/proyectos", icon: FolderOpen, label: "Proyectos" },
  { to: "/cam", icon: MonitorPlay, label: "CAM Wizard" },
  { to: "/maquinas", icon: Cpu, label: "Máquinas" },
  { to: "/herramientas", icon: Wrench, label: "Herramientas" },
  { to: "/jobs", icon: History, label: "Historial" },
  { to: "/cuenta", icon: Settings, label: "Configuración" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const [expandido, setExpandido] = useState(false);

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`
        flex flex-col bg-bg-surface border-r border-border
        fixed md:static top-0 left-0 h-full z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${expandido ? 'w-64' : 'w-16'}
      `}
    >
      {/* Logo - solo desktop */}
      <div className="hidden md:flex h-16 items-center justify-center border-b border-border">
        <Cpu className="h-6 w-6 text-accent-blue" />
      </div>

      {/* Botón cerrar móvil - dentro del sidebar */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border">
        <span className="text-sm font-bold text-text-primary">Menú</span>
        <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded transition">
          <X className="h-5 w-5 text-text-muted" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) => `
              flex items-center gap-3 rounded-xl px-3 py-2.5
              text-sm font-medium transition-all
              ${expandido ? '' : 'justify-center'}
              ${
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              }
            `}
            title={label}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {expandido && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Botón expandir - solo desktop */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="
          hidden md:flex
          absolute -right-3 top-20
          h-6 w-6 items-center justify-center
          rounded-full border border-border bg-bg-surface
          text-text-muted shadow-sm
          hover:border-accent-blue hover:text-accent-blue transition
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
