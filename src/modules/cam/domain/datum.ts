// src/modules/cam/domain/datum.ts
// ─────────────────────────────────────────────────────────────────────────────
// DATUM (cero del programa) — los puntos que el operario puede elegir.
//
// QUÉ VIAJA
//   datum_json = {"origen": <opción>}. El gateway lo reenvía TAL CUAL y el motor
//   lee SOLO `origen` (FreeCAD_CAM_Service/core/cam_builder.py:3365-3366). Las
//   opciones son las de DATUM_OPCIONES_VALIDAS (cam_builder.py:75-81). `{}` =
//   "no declarado": el motor aplica su default técnico (centro_top), igual que
//   antes de que existiera este selector.
//
// EN QUÉ MARCO ESTÁN LOS PUNTOS
//   En el del sólido que el motor mecaniza: el STEP normalizado por
//   step_reader._normalizar_shape (SOLO traslación: centro XY en 0, base en
//   Z=0). El teselado sale de ESE MISMO sólido (freecad_service.py, /tessellate:
//   load_step_get_bounding_box → tessellate_shape), así que un punto calculado
//   sobre meshData.bounding_box y dibujado como hijo de la malla de la pieza cae
//   EXACTAMENTE donde el motor pondrá el cero, gire como gire el visor.
//
// CONVENCIÓN DE EJES (la del motor, no una elegida aquí)
//   _traslacion_marco_datum (cam_builder.py:787-793) traslada el trabajo por -d,
//   con d = el punto que queda en el origen:
//     esquina_sup_izq → d = (−X/2, +Y/2)   ⇒ X mín, Y máx
//     esquina_inf_izq → d = (−X/2, −Y/2)   ⇒ X mín, Y mín
//     esquina_sup_der → d = (+X/2, +Y/2)   ⇒ X máx, Y máx
//     esquina_inf_der → d = (+X/2, −Y/2)   ⇒ X máx, Y mín
//     centro_top      → d = (0, 0)         ⇒ centro XY
//   "sup"/"inf" son en PLANTA (vista desde arriba): sup = +Y, izq = −X.
//   Z: el cero XY se toma sobre la cara SUPERIOR del bruto de la pieza (Z máx),
//   que es donde el operario lo palpa. La Z del programa la decide el marco de
//   referencia del montaje, no este selector.
//
// CRECIMIENTO POR EXTENSIÓN
//   Un punto de datum es una FILA (PuntoDatum) con su posición y el `datum` que
//   se enviaría al elegirlo. Los centros de agujero serán otra función que
//   devuelva más filas del mismo tipo: ni el visor ni el paso Montaje cambian.
// ─────────────────────────────────────────────────────────────────────────────

/** Opciones de origen que el motor acepta hoy (cam_builder.py:75-81). */
export type OrigenDatum =
  | "esquina_sup_izq"
  | "esquina_inf_izq"
  | "esquina_sup_der"
  | "esquina_inf_der"
  | "centro_top";

/** Lo que viaja en datum_json. Sin `origen` = no declarado. */
export interface DatumConfig {
  origen?: OrigenDatum;
}

export const DATUM_NO_DECLARADO: DatumConfig = {};

/** Un punto palpable que el operario puede elegir como cero. */
export interface PuntoDatum {
  /** Identidad estable del punto (única en la lista). */
  id: string;
  /** Nombre corto para el operario. */
  etiqueta: string;
  /** Posición en el marco del sólido del motor (mm, Z arriba). */
  posicion: [number, number, number];
  /** Exactamente lo que se envía en datum_json si se elige este punto. */
  datum: DatumConfig;
}

interface CajaEnvolvente {
  min: number[];
  max: number[];
}

type Extremo = "min" | "max" | "centro";

// Una fila por opción del motor. La correspondencia X/Y de cada una es la de
// _traslacion_marco_datum (ver cabecera); no se deduce de nada más.
const PUNTOS_DE_CAJA: ReadonlyArray<{
  origen: OrigenDatum;
  x: Extremo;
  y: Extremo;
  etiqueta: string;
}> = [
  { origen: "esquina_sup_izq", x: "min", y: "max", etiqueta: "Esquina superior izquierda (X− Y+)" },
  { origen: "esquina_sup_der", x: "max", y: "max", etiqueta: "Esquina superior derecha (X+ Y+)" },
  { origen: "esquina_inf_izq", x: "min", y: "min", etiqueta: "Esquina inferior izquierda (X− Y−)" },
  { origen: "esquina_inf_der", x: "max", y: "min", etiqueta: "Esquina inferior derecha (X+ Y−)" },
  { origen: "centro_top", x: "centro", y: "centro", etiqueta: "Centro de la cara superior" },
];

function coordenada(min: number, max: number, extremo: Extremo): number {
  if (extremo === "min") return min;
  if (extremo === "max") return max;
  return (min + max) / 2;
}

/**
 * Nivel 1: las 4 esquinas superiores y el centro superior de la caja
 * envolvente de la pieza (meshData.bounding_box). Sin caja válida no hay
 * puntos: no se inventa una geometría.
 */
export function puntosDatumDeCaja(caja: CajaEnvolvente | null | undefined): PuntoDatum[] {
  if (!caja || caja.min?.length < 3 || caja.max?.length < 3) return [];
  const [xMin, yMin] = caja.min;
  const [xMax, yMax, zMax] = caja.max;
  if (![xMin, yMin, xMax, yMax, zMax].every(Number.isFinite)) return [];

  return PUNTOS_DE_CAJA.map((fila) => ({
    id: fila.origen,
    etiqueta: fila.etiqueta,
    posicion: [
      coordenada(xMin, xMax, fila.x),
      coordenada(yMin, yMax, fila.y),
      zMax,
    ],
    datum: { origen: fila.origen },
  }));
}

/** Mismo datum = mismo contenido enviado. Sirve para cualquier forma futura. */
export function mismoDatum(a: DatumConfig, b: DatumConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** El punto de la lista cuyo datum es el declarado, o null si ninguno. */
export function puntoDelDatum(
  puntos: PuntoDatum[],
  datum: DatumConfig,
): PuntoDatum | null {
  if (Object.keys(datum).length === 0) return null; // no declarado
  return puntos.find((p) => mismoDatum(p.datum, datum)) ?? null;
}
