// src/modules/cam/components/operaciones/PanelDeslizante.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel lateral que se PLIEGA DESLIZÁNDOSE SOBRE EL VISOR. Nunca lo redimensiona.
//
// ESTA ES LA REGLA DURA DE LA PANTALLA, y el motivo es concreto: si al plegar un
// panel el canvas cambia de tamaño, el raycaster se desincroniza y el picking de
// caras deja de acertar. Ese bug costó horas en el paso Stock y se cerró con un
// ResizeObserver en CamViewer3D. Aquí ni siquiera se llega a esa situación: el
// contenedor del visor mantiene SIEMPRE los mismos píxeles y el panel viaja por
// encima con `transform: translateX`.
//
// De ahí las dos decisiones de implementación que NO se pueden cambiar por
// comodidad:
//   1. `position: absolute` dentro del contenedor del visor — el panel está
//      FUERA del flujo, así que su ancho no participa en ningún cálculo de
//      layout del canvas.
//   2. Se pliega con `transform`, jamás con `width: 0`, `display:none` ni una
//      columna de grid que encoja. `transform` no dispara reflow del hermano;
//      cualquiera de los otros tres sí, y volvería el bug.
//
// El pestillo de plegado vive fuera del panel y se mueve con él, para que siga
// siendo alcanzable cuando el panel está cerrado.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  lado: "izquierda" | "derecha";
  abierto: boolean;
  onAlternar: () => void;
  /** Ancho en píxeles. Fijo: el visor no lo negocia. */
  ancho: number;
  titulo: string;
  /** Contador o insignia junto al título. */
  distintivo?: ReactNode;
  children: ReactNode;
}

export function PanelDeslizante({
  lado,
  abierto,
  onAlternar,
  ancho,
  titulo,
  distintivo,
  children,
}: Props) {
  const esIzquierda = lado === "izquierda";

  // Cerrado = desplazado por completo fuera del borde. El 8px extra esconde la
  // sombra, que si no asoma como una franja en el borde del visor.
  const desplazamiento = esIzquierda ? -(ancho + 8) : ancho + 8;

  // El pestillo acompaña al borde interior del panel: pegado al borde del visor
  // cuando está cerrado, y a `ancho` cuando está abierto.
  const posicionPestillo = abierto ? ancho : 0;

  // Abierto: apunta hacia afuera (plegar). Cerrado: hacia adentro (desplegar).
  const IconoPestillo = esIzquierda
    ? abierto
      ? ChevronLeft
      : ChevronRight
    : abierto
      ? ChevronRight
      : ChevronLeft;

  return (
    <>
      <aside
        aria-hidden={!abierto}
        className={`absolute inset-y-0 z-20 flex flex-col overflow-hidden bg-bg-surface/95 backdrop-blur-sm transition-transform duration-300 ease-out ${
          esIzquierda ? "left-0 border-r" : "right-0 border-l"
        } border-border shadow-soft`}
        style={{
          width: ancho,
          transform: abierto ? "translateX(0)" : `translateX(${desplazamiento}px)`,
        }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            {titulo}
          </h3>
          {distintivo}
        </div>

        {/* El scroll vive DENTRO del panel: la pantalla no crece por su culpa. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>

      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-label={`${abierto ? "Plegar" : "Desplegar"} ${titulo}`}
        title={`${abierto ? "Plegar" : "Desplegar"} ${titulo}`}
        className={`absolute top-1/2 z-30 flex h-14 w-5 -translate-y-1/2 items-center justify-center border border-border bg-bg-elevated text-text-muted shadow-soft transition-all duration-300 ease-out hover:text-text-primary ${
          esIzquierda ? "rounded-r-lg border-l-0" : "rounded-l-lg border-r-0"
        }`}
        style={{ [esIzquierda ? "left" : "right"]: posicionPestillo }}
      >
        <IconoPestillo className="h-4 w-4" />
      </button>
    </>
  );
}
