// src/modules/cam/components/resumen/VisorPiezaResumen.tsx
// La pieza en el Resumen: el MISMO CamViewer3D de los otros pasos, que pinta la
// malla única del store (la sellada por el motor o, sin sellar, la teselada).
// Aquí no se crea otra malla, ni otro visor, ni se pide ninguna teselación.
//
// Sin la malla cargada, el bloque muestra el aviso. El modo Resumen usa la
// geometría del store, encuadra la pieza y dibuja solo cuando cambia la vista.
//
// Solo lectura: no se le pasan operaciones, picking de stock, modo datum ni
// acción de doble clic. Un clic muestra la medida de la cara, como en los
// demás pasos.
import { Box } from "lucide-react";
import type { CamState } from "../../store/camStore";
import { CamViewer3D } from "../CamViewer3D";
import { dimensionesSelladas } from "./hojaSetup";

export const SIN_VISOR =
  "Vista 3D no disponible: la malla de la pieza no está cargada. Este paso no la vuelve a pedir al servidor.";

export function VisorPiezaResumen({ estado }: { estado: CamState }) {
  const dimensiones = dimensionesSelladas(estado);
  const hayMalla = estado.meshData !== null;

  return (
    <div
      role="group"
      aria-label="Vista 3D de la pieza"
      className="relative min-w-0 overflow-hidden rounded-xl border border-border bg-bg-primary"
    >
      {hayMalla && dimensiones ? (
        <div className="relative h-[300px] w-full md:h-[340px]">
          <CamViewer3D
            dimensiones={dimensiones}
            faceIdDestacada={estado.montajeConfig.face_id_apoyo}
            modoResumen
          />
        </div>
      ) : (
        <div className="flex h-[200px] flex-col items-center justify-center gap-2 p-4 text-center">
          <Box className="h-8 w-8 text-text-muted" aria-hidden />
          <p className="text-xs text-text-primary">
            {hayMalla
              ? "Vista 3D no disponible: el motor no devolvió las medidas de la pieza orientada."
              : SIN_VISOR}
          </p>
        </div>
      )}
    </div>
  );
}
