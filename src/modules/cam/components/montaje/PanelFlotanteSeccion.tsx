// src/modules/cam/components/montaje/PanelFlotanteSeccion.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel flotante que muestra el Contenido de UNA sección sobre el visor.
//   · ≥640 px: arriba a la derecha del visor, máx. 380 px de ancho y 70 % de
//     alto, con scroll propio.
//   · <640 px: hoja inferior (bottom sheet) a lo ancho del visor.
// Solo ocupa su caja: fuera de ella el visor sigue orbitando y eligiendo.
// Cabecera con título, estado y resumen (datos de las reglas) y botón Cerrar.
// ─────────────────────────────────────────────────────────────────────────────
import { forwardRef } from "react";
import { X } from "lucide-react";
import {
  ETIQUETA_ESTADO_SECCION,
  estadoDeSeccion,
  type EstadoMontaje,
} from "../../domain/montaje";
import type { SeccionMontajeUI } from "./seccionesMontaje";
import { COLOR_ESTADO, ICONO_ESTADO } from "./estadoSeccionUI";

interface Props {
  seccion: SeccionMontajeUI;
  estado: EstadoMontaje;
  /** Mientras el motor orienta la pieza, los controles quedan deshabilitados. */
  deshabilitado: boolean;
  onCerrar: () => void;
}

export const ID_PANEL_SECCION = "panel-seccion-montaje";

export const PanelFlotanteSeccion = forwardRef<HTMLDivElement, Props>(
  function PanelFlotanteSeccion(
    { seccion, estado, deshabilitado, onCerrar },
    ref,
  ) {
    const estadoSeccion = estadoDeSeccion(seccion, estado);
    const Icono = ICONO_ESTADO[estadoSeccion];
    const { Contenido } = seccion;
    const idTitulo = `${ID_PANEL_SECCION}-titulo`;

    return (
      <div
        ref={ref}
        id={ID_PANEL_SECCION}
        role="dialog"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 z-30 flex max-h-[70%] flex-col rounded-t-2xl border border-border bg-bg-surface shadow-2xl outline-none sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:w-[380px] sm:max-w-[calc(100%-1.5rem)] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
          <Icono
            aria-hidden
            className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR_ESTADO[estadoSeccion]}`}
          />
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-2">
              <span
                id={idTitulo}
                className="truncate text-sm font-semibold text-text-primary"
              >
                {seccion.titulo}
              </span>
              <span
                className={`shrink-0 text-[11px] font-medium ${COLOR_ESTADO[estadoSeccion]}`}
              >
                {ETIQUETA_ESTADO_SECCION[estadoSeccion]}
              </span>
            </p>
            <p className="truncate text-xs text-text-muted">
              {seccion.resumen(estado)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <fieldset
          disabled={deshabilitado}
          aria-busy={deshabilitado}
          className="m-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain border-0 px-4 py-3"
        >
          <Contenido />
        </fieldset>
      </div>
    );
  },
);
