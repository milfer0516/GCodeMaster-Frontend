// src/modules/cam/services/mdeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// ÚNICA puerta de entrada del análisis del MDE al frontend.
//
// El MDE ya existe y ya produce su respuesta: `create_job` la consulta en su
// PASO 12 y la deja en `mde_recommendations`, que el motor declara CAMPO PÚBLICO
// de su contrato y serializa INTACTA (freecad_service._handle_generate_multi).
// Hoy ese payload solo sale por la ruta de generación (`/cam/generate`), que es
// el final del asistente — después de Operaciones.
//
// Por eso el frontend lee el análisis de DOS sitios, en este orden:
//
//   1. `camStore.engineResponse.mde_recommendations`, si el motor ya respondió
//      en esta sesión. Es la respuesta real, sin intermediarios.
//   2. `solicitarRecomendacionesMDE()`, la consulta asesora suelta: el mismo
//      análisis COMPLETO, pedido sin generar G-code.
//
// El paso Operaciones NUNCA rellena huecos: si no hay respuesta, lo dice. No
// deduce un estado, no supone una herramienta y no fabrica una confianza.
//
// SOBRE EL RE-ANÁLISIS: al registrar una herramienta que faltaba se vuelve a
// pedir el análisis ENTERO, nunca una re-evaluación parcial de la operación
// afectada. El razonamiento del MDE es global (una herramienta nueva puede
// cambiar la alternativa de otra operación, o resolver un conflicto entre
// reglas); re-evaluar una sola operación daría un resultado que el motor jamás
// habría emitido.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from "../../../services/api";
import type { RespuestaMDESetup } from "../domain/mdeRecomendaciones";

/**
 * Normaliza lo que llegue a la forma del contrato: un array con una entrada por
 * setup. El motor multi-setup devuelve un array; una consulta de un solo setup
 * devuelve el objeto suelto. Cualquier otra cosa es "no hay análisis" (null),
 * nunca un array vacío — un array vacío diría "el MDE no recomendó nada", que
 * es una afirmación distinta y falsa.
 */
export function normalizarRecomendaciones(bruto: any): RespuestaMDESetup[] | null {
  if (Array.isArray(bruto)) return bruto.length > 0 ? bruto : null;
  if (bruto && typeof bruto === "object" && "status" in bruto) {
    return [{ setup: bruto.setup ?? "OP10", ...bruto }];
  }
  return null;
}

/**
 * Pide al motor el análisis COMPLETO del trabajo y devuelve `mde_recommendations`
 * tal cual lo serializó el MDE. No se resume, no se reordena y no se reinterpreta
 * la evidencia: eso rompería la trazabilidad que el motor garantiza.
 */
export async function solicitarRecomendacionesMDE(
  idJob: number,
): Promise<RespuestaMDESetup[] | null> {
  const { data } = await api.post("/cam/mde-recommendations", { id_job: idJob });
  return normalizarRecomendaciones(data?.mde_recommendations ?? data);
}
