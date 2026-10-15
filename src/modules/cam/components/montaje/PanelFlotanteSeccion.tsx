// src/modules/cam/components/montaje/PanelFlotanteSeccion.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Panel flotante que muestra el Contenido de UNA sección sobre el visor.
//   · ≥640 px: arriba a la derecha del visor, máx. 380 px de ancho y 70 % de
//     alto, con scroll propio.
//   · <640 px: hoja inferior (bottom sheet) a lo ancho del visor.
// Solo ocupa su caja: fuera de ella el visor sigue orbitando y eligiendo.
// Cabecera con título, estado y resumen (datos de las reglas), Minimizar y
// Cerrar. La cabecera es el asa: arrastrarla mueve el panel por toda la
// pantalla visible (useArrastrePanel).
//
// Para salir del recorte del visor (overflow-hidden) el panel se pinta en un
// portal sobre el body, dentro de un marco `fixed` que copia la caja del visor
// (medida con un ancla invisible que sí queda en el visor). Así la posición
// inicial y el 70 % siguen siendo los del visor.
// ─────────────────────────────────────────────────────────────────────────────
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X } from "lucide-react";
import {
  ETIQUETA_ESTADO_SECCION,
  estadoDeSeccion,
  type EstadoMontaje,
} from "../../domain/montaje";
import { useArrastrePanel } from "../../../../hooks/useArrastrePanel";
import type { SeccionMontajeUI } from "./seccionesMontaje";
import {
  COLOR_ESTADO,
  ICONO_ESTADO,
  RELLENO_ESTADO,
} from "./estadoSeccionUI";

interface Props {
  seccion: SeccionMontajeUI;
  estado: EstadoMontaje;
  /** Mientras el motor orienta la pieza, los controles quedan deshabilitados. */
  deshabilitado: boolean;
  /** Solo la cabecera a la vista; el cuerpo sigue montado (no pierde lo escrito). */
  minimizado: boolean;
  onAlternarMinimizado: () => void;
  onCerrar: () => void;
}

export const ID_PANEL_SECCION = "panel-seccion-montaje";

function copiarCaja(ancla: HTMLElement | null, marco: HTMLElement | null) {
  if (!ancla || !marco) return;
  const r = ancla.getBoundingClientRect();
  marco.style.top = `${r.top}px`;
  marco.style.left = `${r.left}px`;
  marco.style.width = `${r.width}px`;
  marco.style.height = `${r.height}px`;
}

export const PanelFlotanteSeccion = forwardRef<HTMLDivElement, Props>(
  function PanelFlotanteSeccion(
    {
      seccion,
      estado,
      deshabilitado,
      minimizado,
      onAlternarMinimizado,
      onCerrar,
    },
    ref,
  ) {
    const estadoSeccion = estadoDeSeccion(seccion, estado);
    const Icono = ICONO_ESTADO[estadoSeccion];
    const { Contenido } = seccion;
    const idTitulo = `${ID_PANEL_SECCION}-titulo`;
    const idCuerpo = `${ID_PANEL_SECCION}-cuerpo`;

    const anclaRef = useRef<HTMLDivElement>(null);
    const marcoRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => panelRef.current as HTMLDivElement, []);

    // El marco copia la caja del visor: en cada render (algo encima pudo
    // moverlo) y cuando el visor cambia de tamaño o la página hace scroll.
    useLayoutEffect(() => {
      copiarCaja(anclaRef.current, marcoRef.current);
    });
    useLayoutEffect(() => {
      const copiar = () => copiarCaja(anclaRef.current, marcoRef.current);
      const ancla = anclaRef.current;
      if (!ancla) return;
      const observador = new ResizeObserver(copiar);
      observador.observe(ancla);
      window.addEventListener("resize", copiar);
      window.addEventListener("scroll", copiar, { capture: true, passive: true });
      return () => {
        observador.disconnect();
        window.removeEventListener("resize", copiar);
        window.removeEventListener("scroll", copiar, { capture: true });
      };
    }, []);

    const { desplazamiento, propsAsa } = useArrastrePanel(panelRef);

    return (
      <>
        <div
          ref={anclaRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
        />
        {createPortal(
          // z-20 y al final del body: sobre la cabecera sticky (z-20) como
          // antes, bajo los fondos de los cajones (z-30) y los modales (z-50).
          <div ref={marcoRef} className="pointer-events-none fixed z-20">
            <div
              ref={panelRef}
              id={ID_PANEL_SECCION}
              role="dialog"
              aria-labelledby={idTitulo}
              tabIndex={-1}
              style={{
                transform: `translate(${desplazamiento.x}px, ${desplazamiento.y}px)`,
              }}
              className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex max-h-[70%] flex-col rounded-t-2xl border border-border bg-bg-surface shadow-2xl outline-none sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:w-[380px] sm:max-w-[calc(100%-1.5rem)] sm:rounded-2xl"
            >
              <div
                {...propsAsa}
                className={`flex shrink-0 items-start gap-2 border-border px-4 py-3 ${minimizado ? "" : "border-b"} ${propsAsa.className}`}
              >
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
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${RELLENO_ESTADO[estadoSeccion]}`}
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
                  onClick={onAlternarMinimizado}
                  aria-expanded={!minimizado}
                  aria-controls={idCuerpo}
                  aria-label={minimizado ? "Restaurar" : "Minimizar"}
                  className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
                >
                  {minimizado ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCerrar}
                  aria-label="Cerrar"
                  className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* El scroll va en un div: un <fieldset> no se comporta como
                  caja de scroll encogible dentro de la columna flex. */}
              <div
                id={idCuerpo}
                hidden={minimizado}
                className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
              >
                <fieldset
                  disabled={deshabilitado}
                  aria-busy={deshabilitado}
                  className="m-0 min-w-0 border-0 p-0"
                >
                  <Contenido />
                </fieldset>
              </div>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  },
);
