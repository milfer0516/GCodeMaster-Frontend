// src/modules/tools/components/inventario/AcordeonFamilia.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Acordeón de UNA familia del inventario (diseño): tarjeta con cabecera
// (cheurón que rota, nombre, píldora con el conteo en mono) y filas separadas
// por borde superior.
// Colores a tokens: tarjeta #14161a → bg-bg-surface; bordes #24282e/#262b32 →
// border-border; hover de cabecera #181b20 → hover:bg-bg-elevated/60.
// ─────────────────────────────────────────────────────────────────────────────
import { ChevronDown } from "lucide-react";

interface Props {
  nombre: string;
  cantidad: number;
  abierto: boolean;
  onAlternar: () => void;
  children: React.ReactNode;
}

export const AcordeonFamilia = ({
  nombre,
  cantidad,
  abierto,
  onAlternar,
  children,
}: Props) => (
  <div className="overflow-hidden rounded-xl border border-border bg-bg-surface">
    <button
      type="button"
      onClick={onAlternar}
      aria-expanded={abierto}
      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] text-text-primary transition hover:bg-bg-elevated/60"
    >
      <ChevronDown
        aria-hidden
        className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 ${
          abierto ? "" : "-rotate-90"
        }`}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{nombre}</span>
      <span className="rounded-full border border-border px-[7px] py-px font-mono text-[11px] text-text-muted">
        {cantidad}
      </span>
    </button>
    {abierto && <div className="flex flex-col">{children}</div>}
  </div>
);
