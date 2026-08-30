// src/lib/setupFaceClassifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// CLASIFICADOR DE ORIENTACIÓN DE CARAS EN EL MARCO DE MÁQUINA — función pura.
//
// El motor rotula las operaciones en el marco INTRÍNSECO de la pieza (marco
// CAD/OCC): "frontal", "posterior", "superior"… Ese rótulo es idempotente
// respecto al montaje y NO se toca. Pero el operario mira la pieza YA MONTADA:
// tras elegir la cara de apoyo, computeSetup rota la pieza para que esa cara
// mire a la mesa (OCC -Z). Una cara rotulada "inferior" en CAD puede quedar
// ARRIBA. Este módulo reexpresa la orientación de una cara en el marco de la
// máquina (Z = vertical, mesa en Z=0) para que la etiqueta que lee el operario
// coincida con lo que ve.
//
// Es PURO y COMPARTIDO a propósito: los pasos Resumen y G-Code lo reutilizarán.
// Sin estado, sin React, sin acceso al store — datos entran, etiqueta sale.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

export type FaceMachineOrientation =
  | "APOYO"
  | "SUPERIOR"
  | "OPUESTA_APOYO"
  | "LATERAL_X_POS"
  | "LATERAL_X_NEG"
  | "LATERAL_Y_POS"
  | "LATERAL_Y_NEG"
  | "CILINDRICA";

/**
 * Umbral de alineación con un eje del WCS. dot > 0.95 ≈ dentro de ~18° del eje;
 * suficiente para distinguir las seis caras de una pieza prismática sin que un
 * chaflán o una tolerancia de teselado la haga saltar de categoría.
 */
export const AXIS_DOT_TOL = 0.95;

export interface ClasificarCaraInput {
  /** face_id de la cara a clasificar. */
  faceId: number;
  /** Normal de la cara en el marco CAD/OCC (analisis.caras_planas[].normal). */
  normalOCC: readonly [number, number, number];
  /** face_id de la cara de apoyo elegida en el montaje. */
  supportFaceId: number;
  /**
   * Rotación del montaje = Setup.rotationOCC, cuaternión [x,y,z,w] en el marco
   * OCC. Es SOLO rotación (sin traslación), justo lo que hace falta para llevar
   * una normal al marco de máquina.
   */
  rotationOCC: readonly [number, number, number, number];
}

/**
 * Clasifica una cara plana según hacia dónde mira TRAS el montaje. Transforma su
 * normal al marco de máquina con la rotación de computeSetup y la compara con
 * los ejes del WCS.
 *
 * Ojo con OPUESTA_APOYO: la cara opuesta a la de apoyo mira hacia ARRIBA, o sea
 * es SUPERIOR. OPUESTA_APOYO solo aplica a una cara que mira hacia ABAJO sin ser
 * la de apoyo (p.ej. un rebaje mirando a la mesa). Como la cara de apoyo se
 * resuelve antes que nada por faceId, cualquier normal en -Z que llegue al test
 * de -Z ya "no es la de apoyo" por construcción.
 *
 * CILINDRICA es aquí el catch-all para una normal que no se alinea con ningún
 * eje (cara curva u oblicua); para caras planas de las piezas en alcance
 * (prismáticas / de revolución con caras anulares) no debería aparecer.
 */
export function clasificarOrientacionCara(
  input: ClasificarCaraInput,
): FaceMachineOrientation {
  const { faceId, normalOCC, supportFaceId, rotationOCC } = input;

  // La cara de apoyo es la de apoyo, cualquiera sea su normal.
  if (faceId === supportFaceId) return "APOYO";

  const q = new THREE.Quaternion(
    rotationOCC[0],
    rotationOCC[1],
    rotationOCC[2],
    rotationOCC[3],
  );
  const n = new THREE.Vector3(normalOCC[0], normalOCC[1], normalOCC[2])
    .normalize()
    .applyQuaternion(q);

  if (n.z > AXIS_DOT_TOL) return "SUPERIOR"; // +Z de máquina = arriba
  if (n.z < -AXIS_DOT_TOL) return "OPUESTA_APOYO"; // mira a la mesa, sin ser apoyo
  if (n.x > AXIS_DOT_TOL) return "LATERAL_X_POS";
  if (n.x < -AXIS_DOT_TOL) return "LATERAL_X_NEG";
  if (n.y > AXIS_DOT_TOL) return "LATERAL_Y_POS";
  if (n.y < -AXIS_DOT_TOL) return "LATERAL_Y_NEG";

  return "CILINDRICA"; // no se alinea con ningún eje del WCS
}

// ── Vocabulario ─────────────────────────────────────────────────────────────
// Validado con dibujo técnico y jerga de taller LATAM. CILINDRICA se rotula
// como "Diámetro exterior" porque su único uso hoy es el contorneado de un OD.
export const ETIQUETA_ORIENTACION: Record<FaceMachineOrientation, string> = {
  APOYO: "Cara de apoyo",
  SUPERIOR: "Cara superior",
  OPUESTA_APOYO: "Cara opuesta al apoyo",
  LATERAL_X_POS: "Cara lateral +X",
  LATERAL_X_NEG: "Cara lateral -X",
  LATERAL_Y_POS: "Cara lateral +Y",
  LATERAL_Y_NEG: "Cara lateral -Y",
  CILINDRICA: "Diámetro exterior",
};

// ── Re-etiquetado de una operación ──────────────────────────────────────────
// Solo estos tipos cambian de rótulo; el resto (taladrado, cajera…) conserva su
// descripción intrínseca, que no depende de la orientación de una cara plana.
const TIPOS_REETIQUETABLES = new Set(["planeado", "contorneado_exterior"]);

const SEPARADOR = " — ";

export interface EtiquetarOperacionInput {
  /** Tipo del motor: "planeado" | "contorneado_exterior" | … */
  tipo: string;
  /** Descripción original del motor, marco CAD (p.ej. "Planeado — cara frontal — 246.0 × 246.0 mm"). */
  descripcion: string;
  /** Caras que toca la operación. */
  faceIndices: readonly number[] | undefined;
  /** Cara de apoyo del montaje (Setup.supportFace.faceId / montajeConfig.face_id_apoyo). */
  supportFaceId: number | null;
  /** Rotación del montaje (Setup.rotationOCC). Null si aún no hay Setup. */
  rotationOCC: readonly [number, number, number, number] | null;
  /** Normal OCC de una cara plana por face_id (de analisis.caras_planas). Null si no es plana. */
  normalPorCara: (faceId: number) => readonly [number, number, number] | null;
  /** ¿La cara es cilíndrica? (meshData.faces[].surface_type === "cylinder"). */
  esCaraCilindrica?: (faceId: number) => boolean;
}

export interface OperacionEtiquetada {
  /** Descripción en el marco de máquina; o la original intacta si no aplica. */
  descripcion: string;
  /** Orientación derivada, o null si no se re-etiquetó. */
  orientacion: FaceMachineOrientation | null;
  /** Traza para el tooltip: "Ref. CAD: cara frontal · face_index: 7", o null. */
  refCad: string | null;
}

/**
 * Parte la descripción del motor en [tipo, cara?, …dims]. El motor emite
 * "Tipo — cara — dims" (3 segmentos). Con menos segmentos no hay una "cara" que
 * sustituir; se devuelve `cara: null` y el resto se conserva.
 */
function partirDescripcion(desc: string): {
  tipo: string;
  cara: string | null;
  resto: string[];
} {
  const partes = desc.split(SEPARADOR).map((s) => s.trim());
  if (partes.length >= 3) {
    return { tipo: partes[0], cara: partes[1], resto: partes.slice(2) };
  }
  return { tipo: partes[0] ?? desc, cara: null, resto: partes.slice(1) };
}

/**
 * Reexpresa la descripción de una operación en el marco de máquina. PURA: no
 * recalcula dimensiones (mantiene las del motor) — solo sustituye el segmento de
 * cara por la orientación de máquina y arma la traza CAD para el tooltip.
 *
 * Si algo impide clasificar con confianza (tipo no re-etiquetable, sin montaje,
 * sin caras, sin normal conocida), devuelve la descripción ORIGINAL intacta: más
 * vale el rótulo intrínseco del motor que uno inventado.
 */
export function etiquetarOperacion(
  input: EtiquetarOperacionInput,
): OperacionEtiquetada {
  const intacta: OperacionEtiquetada = {
    descripcion: input.descripcion,
    orientacion: null,
    refCad: null,
  };

  if (!TIPOS_REETIQUETABLES.has(input.tipo)) return intacta;
  if (input.supportFaceId === null || !input.rotationOCC) return intacta;

  const faces = input.faceIndices ?? [];
  if (faces.length === 0) return intacta;

  // Contorneado exterior sobre superficie cilíndrica → "Diámetro exterior".
  // Es real: una brida trae 1 mm al diámetro para repasarlo en la VMC.
  if (input.tipo === "contorneado_exterior" && input.esCaraCilindrica) {
    const caraCil = faces.find((id) => input.esCaraCilindrica!(id));
    if (caraCil !== undefined) {
      return reconstruir(input.descripcion, "CILINDRICA", caraCil);
    }
  }

  // Cara primaria de la operación: la primera con normal plana conocida. Las
  // operaciones de planeado comparten orientación entre sus caras coplanares,
  // así que la primera manda.
  let caraPrimaria: number | null = null;
  let orientacion: FaceMachineOrientation | null = null;
  for (const faceId of faces) {
    const normalOCC = input.normalPorCara(faceId);
    if (!normalOCC) continue;
    caraPrimaria = faceId;
    orientacion = clasificarOrientacionCara({
      faceId,
      normalOCC,
      supportFaceId: input.supportFaceId,
      rotationOCC: input.rotationOCC,
    });
    break;
  }

  if (caraPrimaria === null || orientacion === null) return intacta;
  return reconstruir(input.descripcion, orientacion, caraPrimaria);
}

/**
 * Arma la descripción de máquina y la traza CAD. Conserva el tipo (primer
 * segmento) y las dimensiones (segmentos finales) del motor; sustituye o inserta
 * la etiqueta de orientación en el segundo segmento.
 */
function reconstruir(
  original: string,
  orientacion: FaceMachineOrientation,
  faceId: number,
): OperacionEtiquetada {
  const { tipo, cara, resto } = partirDescripcion(original);
  const etiqueta = ETIQUETA_ORIENTACION[orientacion];

  const partes = [tipo, etiqueta, ...resto].filter((s) => s.length > 0);
  const descripcion = partes.join(SEPARADOR);

  // El tooltip conserva la referencia intrínseca del motor para trazabilidad.
  const caraCad = cara ?? "sin referencia";
  const refCad = `Ref. CAD: ${caraCad} · face_index: ${faceId}`;

  return { descripcion, orientacion, refCad };
}
