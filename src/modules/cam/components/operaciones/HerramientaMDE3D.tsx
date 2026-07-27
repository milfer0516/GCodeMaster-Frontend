// src/modules/cam/components/operaciones/HerramientaMDE3D.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Render 3D de una herramienta que nombró el MDE.
//
// Reutiliza tal cual las dos capas que ya existen:
//   CAPA 2 · construirHerramienta(familia, params) — funciones PURAS
//   CAPA 1 · <Viewer3D> — ciclo de vida del visor genérico
// Aquí no hay geometría propia ni una sola línea de Three.js: solo el puente.
//
// SI NO HAY CONSTRUCTOR PARA LA FAMILIA, NO SE DIBUJA. `construirHerramienta`
// cae a la fresa plana cuando no reconoce la familia, y eso aquí sería enseñar
// una herramienta que no es la recomendada. `familiaDeToolType` devuelve null en
// ese caso y se muestra el nombre en texto, que es lo que sí se sabe.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { Viewer3D } from "../../../../lib/viewer3d/Viewer3D";
import { construirHerramienta } from "../../../../lib/geometry/herramientas";
import { familiaDeToolType } from "../../domain/mdeRecomendaciones";

interface Props {
  /** ToolType del motor (vocabulario del MDE, no del catálogo). */
  toolType?: string | null;
  diametroMm?: number | null;
  /** Longitud útil MEDIDA de la pieza física, si el taller la registró. */
  longitudUtilMm?: number | null;
  className?: string;
}

const OPCIONES_VISOR = {
  fondo: 0x0d1117,
  grid: false as const,
  fov: 38,
  direccionCamara: [0.9, 0.35, 1] as [number, number, number],
};

export function HerramientaMDE3D({
  toolType,
  diametroMm,
  longitudUtilMm,
  className,
}: Props) {
  const familia = familiaDeToolType(toolType);

  const parametros = useMemo(
    () => ({
      diametro_mm: diametroMm ?? null,
      longitud_util_mm: longitudUtilMm ?? null,
    }),
    [diametroMm, longitudUtilMm],
  );

  // Se reconstruye solo cuando cambian los números que entran a la capa 2.
  const clave = `${familia}|${diametroMm}|${longitudUtilMm}`;
  const objeto = useMemo(
    () => (familia ? construirHerramienta(familia, parametros) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave],
  );

  if (!familia) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border bg-bg-primary px-3 text-center text-[10px] text-text-muted ${className ?? ""}`}
      >
        Sin dibujo paramétrico para esta familia
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-border ${className ?? ""}`}>
      <Viewer3D
        objeto={objeto}
        opciones={OPCIONES_VISOR}
        claveEncuadre={familia}
        className="h-full w-full"
      />
    </div>
  );
}
