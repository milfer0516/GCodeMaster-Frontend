// src/modules/tools/components/HerramientaPreview3D.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 3 · Puente entre el formulario y las capas 1 y 2.
//
// valores del formulario → números (dominio puro) → construirHerramienta
// (capa 2) → <Viewer3D> (capa 1). No hay geometría en este archivo, y no hay
// React en la que construye la geometría.
//
// Cuando hay longitud útil medida se añade la COTA DEL VOLADIZO: el operador
// entiende qué se le está pidiendo mirando el dibujo, no leyendo un párrafo.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import * as THREE from "three";
import { Viewer3D } from "../../../lib/viewer3d/Viewer3D";
import { construirHerramienta } from "../../../lib/geometry/herramientas";
import { resolverParametros } from "../../../lib/geometry/herramientas/parametros";
import { cotaVertical } from "../../../lib/geometry/anotaciones";
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

/** Rigidez por relación voladizo/diámetro — regla de taller. */
function evaluarEsbeltez(ld: number): { texto: string; clase: string } {
  if (ld <= 3)
    return { texto: "rígida", clase: "bg-accent-green/20 text-accent-green" };
  if (ld <= 5)
    return { texto: "vigilar vibración", clase: "bg-accent-amber/20 text-accent-amber" };
  return { texto: "muy esbelta", clase: "bg-accent-red/20 text-accent-red" };
}

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

  const objeto = useMemo(() => {
    const raiz = new THREE.Group();
    raiz.add(construirHerramienta(familia, parametros));

    // Cota del voladizo: de la punta (y = 0) a donde empieza el cono.
    const r = resolverParametros({ ...parametros, familia });
    if (r.tieneLongitudUtil) {
      raiz.add(
        cotaVertical({
          desde: 0,
          hasta: r.longitudExpuesta,
          radio: Math.max(r.R * 2.4, r.R + 6),
        }),
      );
    }
    return raiz;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const voladizo = Number(valores.longitud_util_real_mm);
  const diametro = Number(valores.diametro_mm);
  const hayVoladizo = Number.isFinite(voladizo) && voladizo > 0;
  const ld =
    hayVoladizo && Number.isFinite(diametro) && diametro > 0
      ? voladizo / diametro
      : null;
  const esbeltez = ld !== null ? evaluarEsbeltez(ld) : null;

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

        {/* La cota del voladizo, en números, junto a la flecha del dibujo. */}
        {hayVoladizo && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-black/65 px-2.5 py-1.5 text-right backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-white/60">
              Sobresale
            </p>
            <p className="text-sm font-semibold tabular-nums text-[#4ea1ff]">
              {voladizo} mm
            </p>
            {ld !== null && esbeltez && (
              <p
                className={`mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${esbeltez.clase}`}
              >
                L/D {ld.toFixed(1)} · {esbeltez.texto}
              </p>
            )}
          </div>
        )}

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
