// src/modules/tools/components/inventario/FilaItem.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fila de UN ítem del inventario (diseño): nombre, línea en mono con código y
// medida, insignia de estado y las acciones como TRES ICONOS DIRECTOS en la
// propia fila (ojo = ver, lápiz = editar, papelera = eliminar) — sin menú
// kebab: el desplegable quedaba oculto/cortado y era inusable.
// Sirve igual para una herramienta y para un utillaje.
//
// Colores a tokens: separador de fila #1d2126 → border-border; iconos #101216 →
// bg-bg-primary; opción peligrosa #e08c8c → text-accent-red; texto mono
// #7d848d → text-text-muted.
// ─────────────────────────────────────────────────────────────────────────────
import { Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";

export interface AccionFila {
  etiqueta: string;
  onClick: () => void;
  /** Opción destructiva (se pinta con el token de peligro). */
  peligrosa?: boolean;
}

/** Icono y aria-label corto para cada acción conocida de la fila. */
const PRESENTACION: Record<string, { icono: LucideIcon; aria: string }> = {
  "Ver detalle": { icono: Eye, aria: "Ver" },
  Editar: { icono: Pencil, aria: "Editar" },
  Eliminar: { icono: Trash2, aria: "Eliminar" },
};

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

        {/* Acciones directas: un botón-icono por acción, sin menú oculto */}
        <div className="flex shrink-0 items-center gap-1">
          {acciones.map((a) => {
            const p = PRESENTACION[a.etiqueta];
            const Icono = p?.icono;
            return (
              <button
                key={a.etiqueta}
                type="button"
                aria-label={p?.aria ?? a.etiqueta}
                title={a.etiqueta}
                onClick={a.onClick}
                className={`flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg-primary transition ${
                  a.peligrosa
                    ? "text-accent-red hover:bg-accent-red/10"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {Icono ? (
                  <Icono className="h-3.5 w-3.5" />
                ) : (
                  <span className="px-1 text-[11px]">{a.etiqueta}</span>
                )}
              </button>
            );
          })}
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
