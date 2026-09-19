// src/modules/tools/components/inventario/CajaBusqueda.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Caja de búsqueda de una sección del inventario (diseño: icono + input de 36px
// con borde redondeado). Cada sección tiene la suya.
// Colores a tokens: fondo del input del diseño (#101216) → bg-bg-surface (va
// sobre el marco bg-bg-primary); borde #24282e → border-border; icono y texto
// → text-text-muted / text-text-primary.
// ─────────────────────────────────────────────────────────────────────────────
import { Search } from "lucide-react";

interface Props {
  placeholder: string;
  value: string;
  onChange: (valor: string) => void;
}

export const CajaBusqueda = ({ placeholder, value, onChange }: Props) => (
  <label className="mb-3 flex h-9 items-center gap-2 rounded-lg border border-border bg-bg-surface px-2.5">
    <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={2} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
    />
  </label>
);
