// src/modules/tools/components/HerramientaPreview3D.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · Puente entre el formulario y las capas 1 y 2.
//
// valores del formulario → números (dominio puro) → construirHerramienta
// (capa 2) → <Viewer3D> (capa 1). No hay geometría en este archivo, y no hay
// React en la que construye la geometría.
//
// SIN COTA DE VOLADIZO NI L/D. La herramienta se dibuja con su propia
// geometría (Ø, filo, longitud total), que es lo permanente. El voladizo es
// una decisión de montaje de cada trabajo y se acota en Operaciones, no aquí;
// `cotaVertical` (lib/geometry/anotaciones) queda disponible para ese paso.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { Viewer3D } from "../../../lib/viewer3d/Viewer3D";
import { construirHerramienta } from "../../../lib/geometry/herramientas";
import {
  aParametrosGeometria,
  type ValoresHerramienta,
} from "../domain/valoresHerramienta";
import { familiaLabel } from "../../../services/toolingService";

interface Props {
  valores: ValoresHerramienta;
  /** Oculta la barra de cotas bajo el visor. */
  sinCotas?: boolean;
  claveEncuadre?: string | number;
  className?: string;
}

const OPCIONES_VISOR = {
  fondo: 0x0d1117,
  grid: true as const,
  fov: 38,
  direccionCamara: [0.9, 0.35, 1] as [number, number, number],
};

export function HerramientaPreview3D({
  valores,
  sinCotas,
  claveEncuadre,
  className,
}: Props) {
  const parametros = aParametrosGeometria(valores);
  const familia = valores.familia || "fresa_plana";

  // Se reconstruye cuando cambia CUALQUIER cota. La clave serializa solo los
  // números que entran a la capa 2: escribir en "marca" no rehace la geometría.
  const clave = JSON.stringify([familia, parametros]);

  // La herramienta y nada más: su geometría permanente es toda la proyección
  // representativa que necesita esta pantalla.
  const objeto = useMemo(
    () => construirHerramienta(familia, parametros),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave],
  );

  const cotas = [
    valores.diametro_mm && `Ø${valores.diametro_mm}`,
    valores.largo_filo_mm && `filo ${valores.largo_filo_mm}`,
    valores.largo_total_mm && `total ${valores.largo_total_mm}`,
  ].filter(Boolean) as string[];

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <Viewer3D
        objeto={objeto}
        opciones={OPCIONES_VISOR}
        claveEncuadre={claveEncuadre ?? familia}
        className="h-full w-full"
      >
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
          {valores.familia ? familiaLabel(valores.familia) : "Vista previa"}
        </div>

        {!sinCotas && cotas.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            {cotas.map((c) => (
              <span
                key={c}
                className="rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm"
              >
                {c} mm
              </span>
            ))}
          </div>
        )}
      </Viewer3D>
    </div>
  );
}
