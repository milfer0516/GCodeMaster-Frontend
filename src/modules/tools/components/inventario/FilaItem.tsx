// src/modules/tools/components/inventario/FilaItem.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fila de UN ítem del inventario (diseño): nombre, línea en mono con código y
// medida, insignia de estado y menú de acciones (kebab ⋮ con desplegable).
// Sirve igual para una herramienta y para un utillaje.
//
// Colores a tokens: separador de fila #1d2126 → border-border; kebab #101216 →
// bg-bg-primary; desplegable #191c21 → bg-bg-elevated; hover de opción #22262d
// → hover:bg-bg-primary/70; opción peligrosa #e08c8c → text-accent-red; texto
// mono #7d848d → text-text-muted.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { MoreVertical } from "lucide-react";

export interface AccionFila {
  etiqueta: string;
  onClick: () => void;
  /** Opción destructiva (se pinta con el token de peligro). */
  peligrosa?: boolean;
}

interface Props {
  nombre: string;
  /** Código en mono (p.ej. "BR-085" o "UT-9"). Vacío si no aplica. */
  codigo?: string;
  /** Medida en mono (p.ej. "Ø 8,5 mm" o "boca: 125"). Vacío si no aplica. */
  detalle?: string;
  badge: { texto: string; clases: string };
  acciones: AccionFila[];
  /** Contenido extra desplegable bajo la fila (detalle). */
  expandido?: boolean;
  detalleExpandido?: React.ReactNode;
}

export const FilaItem = ({
  nombre,
  codigo,
  detalle,
  badge,
  acciones,
  expandido = false,
  detalleExpandido,
}: Props) => {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] text-text-primary">
            {nombre}
          </div>
          {(codigo || detalle) && (
            <div className="flex gap-2.5 pt-0.5 font-mono text-[11px] text-text-muted">
              {codigo && <span>{codigo}</span>}
              {detalle && <span>{detalle}</span>}
            </div>
          )}
        </div>

        <span
          className={`shrink-0 rounded-full border px-2 py-[3px] text-[11.5px] ${badge.clases}`}
        >
          {badge.texto}
        </span>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`Acciones de ${nombre}`}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg-primary text-text-muted transition hover:text-text-primary"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {menuAbierto && (
            <>
              {/* Captura el clic fuera para cerrar */}
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuAbierto(false)}
              />
              <div className="absolute right-0 top-8 z-20 flex min-w-[140px] flex-col rounded-lg border border-border bg-bg-elevated p-1 shadow-soft">
                {acciones.map((a) => (
                  <button
                    key={a.etiqueta}
                    type="button"
                    onClick={() => {
                      setMenuAbierto(false);
                      a.onClick();
                    }}
                    className={`rounded px-2.5 py-[7px] text-left text-[13px] transition hover:bg-bg-primary/70 ${
                      a.peligrosa ? "text-accent-red" : "text-text-primary"
                    }`}
                  >
                    {a.etiqueta}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {expandido && detalleExpandido && (
        <div className="border-t border-border/60 px-3 py-2.5">
          {detalleExpandido}
        </div>
      )}
    </div>
  );
};
