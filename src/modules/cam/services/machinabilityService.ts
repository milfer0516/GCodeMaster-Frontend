// src/modules/cam/services/machinabilityService.ts
// ─────────────────────────────────────────────────────────────────────────────
// ÚNICA puerta de entrada del veredicto de mecanizabilidad al frontend.
//
// Misma postura que mdeService: el motor opina, el frontend transporta y
// renderiza. Aquí no se calcula un veredicto, no se completa el que falte y no
// se traduce un motivo (eso vive en domain/mecanizabilidad.ts).
//
// LA PETICIÓN NO LLEVA EL STEP, a diferencia de `/cam/generate` y
// `/cam/mde-recommendations`. No es una excepción al patrón: es que la
// geometría YA está analizada y persistida en el job desde `/cam/analyze`, y el
// gateway la lee de `job.geometria_json` (cam_routes.machinability). Reenviar el
// archivo provocaría un segundo análisis de la misma pieza — justo lo que este
// diseño evita — y abriría la puerta a que el veredicto se emitiera sobre una
// geometría distinta de la que el operario confirmó en el montaje.
//
// `face_id_apoyo` y `id_maquina` viajan aunque sean null. NO se filtran ni se
// sustituyen por un valor por defecto: "todavía no se confirmó la cara" y "no
// hay máquina declarada" son ESTADOS DEL DOMINIO que el motor responde con
// veredicto `desconocido` y su motivo. Taparlos aquí convertiría una respuesta
// honesta del motor en un error de red inventado por el frontend.
//
// SOLO LECTURA: no crea Job, no escribe G-Code y no cambia estado, así que se
// puede volver a preguntar cada vez que el operario cambie el montaje.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from "../../../services/api";
import type { RespuestaMecanizabilidad } from "../domain/mecanizabilidad";

/** Lo único que el motor necesita para emitir el veredicto de ESTE montaje. */
export interface ConsultaMecanizabilidad {
  idJob: number;
  /** La cara que confirmó el operario. null = todavía no eligió ninguna. */
  faceIdApoyo: number | null;
  /**
   * Identidad de la máquina declarada: la PK de la fila de `maquinas`, no su
   * `nombre` (eso es presentación). null = no hay ninguna registrada en la
   * sesión, y el motor lo responde como `cinematica_no_declarada`.
   */
  idMaquina: number | null;
}

/**
 * Comprueba que lo recibido SEA el contrato, y si no lo es devuelve null.
 *
 * La marca es `operaciones`: el motor SIEMPRE devuelve la lista completa,
 * aunque todas salgan `desconocido` (core/machinability.evaluar). Si no está,
 * no hay veredicto que mostrar — y null significa exactamente eso, "no hay
 * respuesta", que NO es lo mismo que `desconocido`. `desconocido` lo dice el
 * motor; null lo dice la ausencia de motor.
 */
export function normalizarMecanizabilidad(
  bruto: unknown,
): RespuestaMecanizabilidad | null {
  if (bruto === null || typeof bruto !== "object") return null;
  const { operaciones } = bruto as { operaciones?: unknown };
  if (!Array.isArray(operaciones)) return null;
  return bruto as RespuestaMecanizabilidad;
}

/**
 * Pide el veredicto y devuelve la respuesta del motor TAL CUAL. No se filtran
 * operaciones, no se reordenan, no se recuentan los totales de `resumen` y no
 * se renombra un campo: el gateway ya la reenvía verbatim y el frontend hace lo
 * mismo hasta la pantalla.
 */
export async function solicitarMecanizabilidad(
  consulta: ConsultaMecanizabilidad,
): Promise<RespuestaMecanizabilidad | null> {
  const path = "/cam/machinability";
  const payload = {
    id_job: consulta.idJob,
    face_id_apoyo: consulta.faceIdApoyo,
    id_maquina: consulta.idMaquina,
  };

  // [MACH-DEEP] Antes de la petición: baseURL (atrapa VITE_API_URL_* undefined),
  // URL final y payload. Si baseURL sale undefined, la env no llegó al bundle.
  console.log("[MACH-DEEP] solicitarMecanizabilidad → antes de api.post", {
    baseURL: api.defaults.baseURL,
    mode: import.meta.env.MODE,
    urlFinal: `${api.defaults.baseURL ?? "(baseURL UNDEFINED)"}${path}`,
    payload,
  });

  try {
    const { data } = await api.post(path, payload);
    // [MACH-DEEP] Respuesta cruda del gateway antes de normalizar.
    console.log("[MACH-DEEP] solicitarMecanizabilidad ← respuesta", { data });
    return normalizarMecanizabilidad(data);
  } catch (e) {
    // [MACH-DEEP] Error de red/HTTP con el detalle de axios si existe.
    console.error("[MACH-DEEP] solicitarMecanizabilidad ✗ error", e, {
      // @ts-expect-error inspección de diagnóstico
      status: e?.response?.status,
      // @ts-expect-error inspección de diagnóstico
      responseData: e?.response?.data,
    });
    throw e;
  }
}
