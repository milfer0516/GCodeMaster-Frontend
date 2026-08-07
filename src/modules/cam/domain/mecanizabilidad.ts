// src/modules/cam/domain/mecanizabilidad.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — espejo de SOLO LECTURA del contrato de mecanizabilidad.
//
// El motor (FreeCAD_CAM_Service/core/machinability.py) responde UN veredicto por
// operación con la pieza apoyada en la cara que confirmó el operario, y el
// gateway lo devuelve VERBATIM (`POST /cam/machinability`). Aquí no se razona
// fabricación:
//
//   · No se calcula un veredicto, no se corrige uno y no se completa el que
//     falte. Si el motor dijo `desconocido`, la pantalla dice `desconocido`.
//   · NO se miran normales, face_ids, números de setup ni tipos de operación
//     para decidir qué mostrar. Ese fue justamente el error que este contrato
//     existe para eliminar: la accesibilidad es dominio del motor, no de la UI.
//   · Los contadores se LEEN de `resumen`, no se recuentan aquí: si el frontend
//     los sumara por su cuenta y el motor cambiara una regla, la pantalla
//     empezaría a discrepar del veredicto sin que nada fallara.
//
// Lo único que hace este archivo es traducir CÓDIGOS a español, igual que
// mdeRecomendaciones.ts con el MDE: el motor emite códigos estables y la
// redacción es del consumidor.
//
// Sin React, sin Zustand, sin fetch.
// ─────────────────────────────────────────────────────────────────────────────

// ── Contrato serializado (core/machinability.py) ────────────────────────────

/** Los TRES veredictos del motor. No hay más y no se agregan por caso. */
export type Veredicto = "alcanzable" | "no_alcanzable" | "desconocido";

export const ALCANZABLE = "alcanzable" as const;
export const NO_ALCANZABLE = "no_alcanzable" as const;
export const DESCONOCIDO = "desconocido" as const;

export interface OperacionMecanizabilidad {
  /** Copiado TAL CUAL del análisis: es la clave del cruce con la lista. */
  op_id: string | null;
  tipo: string | null;
  subtipo: string | null;
  descripcion: string | null;
  mecanizabilidad: Veredicto;
  motivo: string;
  /** Trazabilidad del motor (dot, eje requerido, origen…). Se muestra, no se usa. */
  evidencia: Record<string, any>;
}

export interface ResumenMecanizabilidad {
  alcanzable: number;
  no_alcanzable: number;
  desconocido: number;
  total: number;
  /** Conteo por código de motivo, tal como lo emite el motor. */
  por_motivo: Record<string, number>;
}

export interface MontajeEvaluado {
  face_id_apoyo: number | null;
  normal_apoyo: number[] | null;
  eje_herramienta_montaje: number[] | null;
  resuelto: boolean;
}

export interface CinematicaEvaluada {
  machine_key: string | null;
  machine_type: string | null;
  declarada: boolean;
  evaluable: boolean;
}

export interface RespuestaMecanizabilidad {
  exito: boolean;
  contrato_mecanizabilidad: number;
  montaje: MontajeEvaluado;
  cinematica: CinematicaEvaluada;
  operaciones: OperacionMecanizabilidad[];
  resumen: ResumenMecanizabilidad;
}

// ── Códigos de motivo (core/machinability.py) ───────────────────────────────

export const MOTIVO = {
  ALINEADO: "alineado_con_husillo",
  BIDIRECCIONAL: "eje_paralelo_bidireccional",
  MONTAJE_OPUESTO: "requiere_montaje_opuesto",
  EJE_INCLINADO: "requiere_eje_inclinado",
  SIN_ORIENTACION: "analisis_sin_orientacion",
  CINEMATICA: "cinematica_no_declarada",
  APOYO_DESCONOCIDO: "cara_apoyo_no_reconocida",
  APOYO_SIN_NORMAL: "cara_apoyo_sin_normal",
  ORIENTACION_AUSENTE: "orientacion_ausente",
  ORIENTACION_NO_RESUELTA: "orientacion_no_resuelta",
  PASANTE_NO_CONFIRMADO: "pasante_no_confirmado",
} as const;

/**
 * Una frase por código. El motor manda el código; el texto es nuestro. Un código
 * sin traducción se muestra TAL CUAL (`textoMotivo`): mejor un código en
 * pantalla que una frase inventada que no corresponda al veredicto.
 */
export const TEXTO_MOTIVO: Record<string, string> = {
  [MOTIVO.ALINEADO]: "La operación queda de frente al husillo en este montaje",
  [MOTIVO.BIDIRECCIONAL]:
    "El eje de la operación es paralelo al husillo y sirve en los dos sentidos",
  [MOTIVO.MONTAJE_OPUESTO]:
    "Se ataca desde el lado contrario: hace falta voltear la pieza en un segundo montaje",
  [MOTIVO.EJE_INCLINADO]:
    "Pide atacar en un eje inclinado respecto al husillo de este montaje",
  [MOTIVO.SIN_ORIENTACION]:
    "Este análisis se hizo antes de que el sistema midiera la orientación de las operaciones",
  [MOTIVO.CINEMATICA]:
    "La cinemática de la máquina no está declarada, así que no se puede afirmar nada del montaje",
  [MOTIVO.APOYO_DESCONOCIDO]:
    "La cara de apoyo elegida no está entre las caras planas del análisis",
  [MOTIVO.APOYO_SIN_NORMAL]:
    "El análisis no trae la dirección de la cara de apoyo elegida",
  [MOTIVO.ORIENTACION_AUSENTE]:
    "El análisis no trae orientación para esta operación",
  [MOTIVO.ORIENTACION_NO_RESUELTA]:
    "El análisis no resolvió desde qué dirección se ataca esta operación",
  [MOTIVO.PASANTE_NO_CONFIRMADO]:
    "No se confirmó ningún extremo del agujero, así que su dirección no es segura",
};

export function textoMotivo(motivo: string | null | undefined): string {
  if (!motivo) return "";
  return TEXTO_MOTIVO[motivo] ?? motivo;
}

/**
 * H11 — `analisis_sin_orientacion` es el ÚNICO `desconocido` con remedio: el
 * análisis persistido es anterior al contrato de orientación, así que volver a
 * analizar la pieza sí cambia la respuesta. Los demás `desconocido` no se
 * arreglan repitiendo el análisis, y ofrecerlo sería mandar al operario a dar
 * una vuelta inútil. Mismo veredicto, mensaje distinto — a propósito.
 */
export function tieneRemedioReanalisis(motivo: string | null | undefined): boolean {
  return motivo === MOTIVO.SIN_ORIENTACION;
}

export const TEXTO_REMEDIO_REANALISIS =
  "Vuelve a cargar y analizar la pieza: el análisis guardado es anterior a esta comprobación.";

// ── Presentación del veredicto ──────────────────────────────────────────────
// Tablas código → etiqueta/estilo. Ningún estilo se decide con geometría.

export const VEREDICTO_ETIQUETA: Record<Veredicto, string> = {
  [ALCANZABLE]: "Alcanzable",
  [NO_ALCANZABLE]: "No alcanzable",
  [DESCONOCIDO]: "Desconocido",
};

export const VEREDICTO_CLASE: Record<Veredicto, string> = {
  [ALCANZABLE]: "border-green-500/30 bg-green-500/10 text-green-400",
  [NO_ALCANZABLE]: "border-red-500/30 bg-red-500/10 text-red-400",
  [DESCONOCIDO]: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

/** Punto de color para el contador de cabecera. */
export const VEREDICTO_PUNTO: Record<Veredicto, string> = {
  [ALCANZABLE]: "bg-green-500",
  [NO_ALCANZABLE]: "bg-red-500",
  [DESCONOCIDO]: "bg-slate-500",
};

// ── Índice op_id → veredicto ────────────────────────────────────────────────
//
// El motor devuelve la lista COMPLETA de operaciones, en el mismo orden y con el
// MISMO op_id que el análisis (core/machinability.evaluar). El cruce es por
// op_id y por nada más: ni por posición, ni por tipo, ni por setup.

export type IndiceMecanizabilidad = Map<string, OperacionMecanizabilidad>;

export function indexarMecanizabilidad(
  respuesta: RespuestaMecanizabilidad | null,
): IndiceMecanizabilidad {
  const indice: IndiceMecanizabilidad = new Map();
  for (const op of respuesta?.operaciones ?? []) {
    if (op?.op_id == null) continue;
    indice.set(String(op.op_id), op);
  }
  return indice;
}

/**
 * El veredicto de UNA operación, o null si el motor no emitió uno para ella.
 * null NO es `desconocido`: `desconocido` lo dice el motor, null es "aquí no hay
 * respuesta". Confundirlos sería atribuirle al motor una decisión que no tomó.
 */
export function veredictoDe(
  indice: IndiceMecanizabilidad,
  op: { id: string },
): OperacionMecanizabilidad | null {
  return indice.get(op.id) ?? null;
}

/** Cuántas operaciones reportó el motor con ese motivo. Lectura de `resumen`. */
export function conteoPorMotivo(
  respuesta: RespuestaMecanizabilidad | null,
  motivo: string,
): number {
  return respuesta?.resumen?.por_motivo?.[motivo] ?? 0;
}
