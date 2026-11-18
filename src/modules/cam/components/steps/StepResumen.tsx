// src/modules/cam/components/steps/StepResumen.tsx
// RESUMEN DEL PROCESO DE MECANIZADO (hoja de setup) antes de generar: la pieza
// en el visor 3D único, lo que ya tienen los pasos anteriores (pieza, material
// y stock, máquina, montaje, cero) y la tabla de operaciones seleccionadas con
// la herramienta que nombró el MDE y su S y F. El modelo de cada fila vive en
// components/resumen/hojaSetup.ts (puro); aquí solo se compone la pantalla.
// Este paso no llama a la API ni calcula valores de fabricación, y la hoja no
// muestra nada de la respuesta de generación (eso es del paso de resultado).
// El botón inferior es el "Siguiente paso" de siempre (WizardNavButtons).
import { useMemo } from "react";
import {
  AlertCircle,
  Box,
  ClipboardList,
  Crosshair,
  Layers3,
  MonitorCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useCamStore } from "../../store/camStore";
import { WizardNavButtons } from "./WizardNavButtons";
import {
  hojaDeSetup,
  operacionesDeLaHoja,
  type IdSeccion,
} from "../resumen/hojaSetup";
import { BloqueSeccion } from "../resumen/BloqueSeccion";
import { ListaOperacionesHoja } from "../resumen/ListaOperacionesHoja";
import { VisorPiezaResumen } from "../resumen/VisorPiezaResumen";

export const TITULO_RESUMEN = "Resumen del proceso de mecanizado";

// Solo iconos (sin dibujos de máquina ni de utillaje). Record<IdSeccion, …>
// obliga a que cada sección del modelo tenga el suyo.
const ICONO_SECCION: Record<IdSeccion, LucideIcon> = {
  pieza: Box,
  material: Layers3,
  maquina: MonitorCog,
  montaje: Wrench,
  cero: Crosshair,
};

export const StepResumen = () => {
  const estado = useCamStore((s) => s);
  const engineResponse = estado.engineResponse;

  const secciones = useMemo(() => hojaDeSetup(estado), [estado]);
  const operaciones = useMemo(() => operacionesDeLaHoja(estado), [estado]);
  // La pieza va junto al visor; el resto, debajo en su orden.
  const seccionPieza = secciones.find((s) => s.id === "pieza");
  const seccionCero = secciones.find((s) => s.id === "cero");
  const seccionesMedias = secciones.filter(
    (s) => s.id !== "pieza" && s.id !== "cero",
  );

  // Bloque PREVIO, sin cambios: pasos.ts bloquea "Siguiente" con
  // engineResponse.error, así que su motivo tiene que seguir a la vista.
  // Display engine's Spanish validation error if stock is too small
  if (engineResponse?.error) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-text-primary">
            Validación de Material
          </h2>
          <p className="mt-1 text-xs md:text-sm text-text-muted">
            El motor CAM detectó un problema con el material bruto
          </p>
        </div>

        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 md:p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base font-semibold text-red-300">
                Material insuficiente
              </p>
              <p className="mt-2 text-xs md:text-sm text-red-200">
                {engineResponse.error}
              </p>
              <button
                onClick={() => useCamStore.getState().irA("stock")}
                className="mt-4 rounded-xl border border-red-500/60 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/30 transition"
              >
                ← Volver a configurar material bruto
              </button>
            </div>
          </div>
        </div>

        <WizardNavButtons />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue md:h-12 md:w-12">
          <ClipboardList className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base md:text-xl font-bold text-text-primary">
            {TITULO_RESUMEN}
          </h2>
          <p className="mt-1 text-xs md:text-sm text-text-muted">
            Hoja de preparación (setup sheet). Revise cada decisión antes de
            generar el programa: es lo que declaró en los pasos anteriores y lo
            que ya devolvieron el sellado de la pieza y el MDE. Si una fila
            muestra un «valor inicial», ese valor se enviará aunque usted no lo
            haya elegido.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisorPiezaResumen estado={estado} />
        {seccionPieza && (
          <BloqueSeccion seccion={seccionPieza} icono={ICONO_SECCION.pieza} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {seccionesMedias.map((seccion) => (
          <BloqueSeccion
            key={seccion.id}
            seccion={seccion}
            icono={ICONO_SECCION[seccion.id]}
          />
        ))}
      </div>

      {seccionCero && (
        <BloqueSeccion seccion={seccionCero} icono={ICONO_SECCION.cero} />
      )}

      <ListaOperacionesHoja hoja={operaciones} />

      <WizardNavButtons />
    </div>
  );
};
