// src/modules/cam/domain/setupSellado.ts
// ─────────────────────────────────────────────────────────────────────────────
// SETUP DEL MONTAJE — construido SOLO con los datos sellados por el motor.
//
// Al sellar la cara de apoyo, el motor (/cam/analyze-setup) devuelve la pieza
// ya en el MARCO DE MECANIZADO: Z arriba, cara de apoyo sobre la mesa, XY
// centrado, base en Z=0, con sus medidas en `dimensiones_marco` y el análisis
// en ese mismo marco. El Setup se lee de ahí: el frontend NO calcula ninguna
// rotación propia. (Antes, utils/computeSetup.ts rotaba la malla ORIGINAL con
// un cuaternión propio; si su giro en el plano no coincidía con el del motor,
// ancho y fondo se intercambiaban y los sobre-materiales caían en el eje
// equivocado sin ningún error.)
//
// En el marco sellado, por definición:
//   · cara de apoyo  = la de ABAJO  (normal −Z) → dirección de stock z_neg.
//   · cara mecanizada = la de ARRIBA (normal +Z) → dirección de stock z_pos.
//
// PURO: ni React, ni store, ni three.js. Datos en → Setup (o error) fuera.
// ─────────────────────────────────────────────────────────────────────────────

/** Vector en el marco de máquina (= marco de mecanizado sellado). */
export type Vec3 = [number, number, number];

export interface Setup {
  id: string;
  createdAt: string;
  confirmed: boolean;

  // Caras, con su normal en el marco de máquina.
  supportFace: { faceId: number; normal: Vec3 };
  // faceId: no se identifica una cara concreta; la dirección es la de arriba.
  machiningFace: { faceId: number | null; normal: Vec3 };

  // Cota mesa → cara inferior de la pieza (la mide el operario en la sujeción).
  zApoyoMm: number;

  // Envolvente de la pieza montada, en el marco de máquina: XY centrado en 0,
  // base en zApoyoMm. width/depth/height = dimensiones_marco x/y/z del motor.
  rotatedBBox: {
    min: Vec3;
    max: Vec3;
    center: Vec3;
    width: number; // X
    depth: number; // Y
    height: number; // Z (vertical)
  };

  // Ø y longitud axial del cilindro exterior DOMINANTE (análisis sellado), o
  // null si la pieza no tiene uno. La plausibilidad la decide el consumidor
  // (cylPartDims): un cilindro dominante puede ser solo una banda corta.
  partCylinderOD: number | null;
  partCylinderLen: number | null;
}

/** Lo que el Setup necesita de la respuesta de sellado del motor. */
export interface OrientacionSelladaParaSetup {
  face_id_apoyo: number;
  dimensiones_marco?: { x: number; y: number; z: number } | null;
  analisis?: Record<string, any> | null;
}

export class ErrorSetupSellado extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorSetupSellado";
  }
}

const ABAJO: Vec3 = [0, 0, -1];
const ARRIBA: Vec3 = [0, 0, 1];

function medidaValida(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function makeId(): string {
  try {
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* ignore */
  }
  return `setup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * El cilindro EXTERIOR dominante: el de mayor diámetro entre las caras
 * cilíndricas que no son agujero (mismo criterio que el motor para el perfil
 * exterior). Sin cilindro exterior (p. ej. una placa), null.
 */
function cilindroExteriorDominante(
  analisis: Record<string, any> | null | undefined,
): { od: number; len: number | null } | null {
  const cilindros: any[] = analisis?.caras_cilindricas ?? [];
  const exteriores = cilindros.filter(
    (c) => c && c.es_agujero === false && medidaValida(c.diametro_mm),
  );
  if (!exteriores.length) return null;
  const dominante = exteriores.reduce((a, b) =>
    b.diametro_mm > a.diametro_mm ? b : a,
  );
  return {
    od: dominante.diametro_mm as number,
    len: medidaValida(dominante.profundidad_mm)
      ? (dominante.profundidad_mm as number)
      : null,
  };
}

/**
 * Construye el Setup desde la orientación sellada por el motor.
 * Sin orientación sellada o sin `dimensiones_marco` válidas LANZA: nunca se
 * sustituye por otra medida.
 */
export function setupDesdeOrientacionSellada(
  sellada: OrientacionSelladaParaSetup | null,
  zApoyoMm: number,
): Setup {
  if (!sellada) {
    throw new ErrorSetupSellado(
      "No hay cara de apoyo establecida: establezca la cara de apoyo antes de continuar.",
    );
  }
  const dims = sellada.dimensiones_marco;
  if (!dims || !medidaValida(dims.x) || !medidaValida(dims.y) || !medidaValida(dims.z)) {
    throw new ErrorSetupSellado(
      "El motor no devolvió las medidas de la pieza orientada. Vuelva a establecer la cara de apoyo.",
    );
  }

  const width = dims.x;
  const depth = dims.y;
  const height = dims.z;
  const cilindro = cilindroExteriorDominante(sellada.analisis);

  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    confirmed: true,
    supportFace: { faceId: sellada.face_id_apoyo, normal: ABAJO },
    machiningFace: { faceId: null, normal: ARRIBA },
    zApoyoMm,
    rotatedBBox: {
      min: [-width / 2, -depth / 2, zApoyoMm],
      max: [width / 2, depth / 2, zApoyoMm + height],
      center: [0, 0, zApoyoMm + height / 2],
      width,
      depth,
      height,
    },
    partCylinderOD: cilindro?.od ?? null,
    partCylinderLen: cilindro?.len ?? null,
  };
}
