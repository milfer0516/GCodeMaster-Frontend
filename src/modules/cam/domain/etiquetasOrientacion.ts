// src/modules/cam/domain/etiquetasOrientacion.ts
// ─────────────────────────────────────────────────────────────────────────────
// Adaptador fino entre el estado del wizard CAM y el clasificador puro
// (src/lib/setupFaceClassifier). Arma los lookups que la función pura necesita
// (normal por cara, cara cilíndrica) a partir de `analisis` y `meshData`, y
// devuelve un índice op_id → OperacionEtiquetada.
//
// Aquí NO vive geometría: solo el cableado. La regla de clasificación y el
// vocabulario están en el helper compartido para que Resumen y G-Code los
// reutilicen sin duplicar.
// ─────────────────────────────────────────────────────────────────────────────
import {
  etiquetarOperacion,
  type OperacionEtiquetada,
} from "../../../lib/setupFaceClassifier";
import type { Operacion } from "../store/camStore";
import type { Setup } from "../utils/computeSetup";
import type { MeshData } from "../services/camService";

export type IndiceEtiquetas = Map<string, OperacionEtiquetada>;

/**
 * Construye las etiquetas de orientación (marco de máquina) para cada operación.
 * Sin Setup confirmado o sin caras planas en el análisis, devuelve un índice
 * vacío: cada fila cae a su descripción original del motor.
 */
export function construirEtiquetasOrientacion(
  operaciones: Operacion[],
  setup: Setup | null,
  analisis: Record<string, any> | null,
  meshData: MeshData | null,
): IndiceEtiquetas {
  const indice: IndiceEtiquetas = new Map();
  if (!setup) return indice;

  // Normal OCC confiable por cara (la del análisis, ya corregida de signo).
  const normalPorCara = (() => {
    const mapa = new Map<number, readonly [number, number, number]>();
    for (const c of (analisis?.caras_planas ?? []) as any[]) {
      if (c?.normal && c.normal.length === 3) {
        mapa.set(c.face_index, [c.normal[0], c.normal[1], c.normal[2]]);
      }
    }
    return (faceId: number) => mapa.get(faceId) ?? null;
  })();

  // Caras cilíndricas por el tipo de superficie del teselado.
  const carasCilindricas = new Set<number>();
  for (const f of meshData?.faces ?? []) {
    if (f.surface_type === "cylinder") carasCilindricas.add(f.face_id);
  }
  const esCaraCilindrica = (faceId: number) => carasCilindricas.has(faceId);

  for (const op of operaciones) {
    indice.set(
      op.id,
      etiquetarOperacion({
        tipo: op.tipo,
        descripcion: op.descripcion,
        faceIndices: op.face_indices,
        supportFaceId: setup.supportFace.faceId,
        rotationOCC: setup.rotationOCC,
        normalPorCara,
        esCaraCilindrica,
      }),
    );
  }

  return indice;
}
