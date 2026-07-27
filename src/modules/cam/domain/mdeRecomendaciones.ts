// src/modules/cam/domain/mdeRecomendaciones.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — espejo de solo lectura del contrato público del MDE.
//
// El motor entrega `mde_recommendations` (FreeCAD_CAM_Service/mde/output.py,
// MDEOutput.to_dict) y el frontend LO RENDERIZA. Aquí no se razona: no se
// decide un estado, no se puntúa una confianza, no se elige una herramienta.
// Solo se LEE la respuesta y se traduce a español, que es exactamente el
// trabajo que el motor delega en el consumidor:
//
//   "LANGUAGE-FREE BY CONTRACT (A2.5): a Fact carries NO human-readable prose.
//    Rendering a sentence in any language is the consumer's job, outside the
//    engine. The MDE never emits user-facing text."   — mde/evidence.py
//
// Por eso este archivo tiene tablas `código → texto` y NADA más. Si mañana el
// motor cambia una regla, aquí no se toca una línea: los códigos son estables.
//
// LO QUE NO ESTÁ AQUÍ, A PROPÓSITO:
//   · tiempo estimado (por operación o total) — el MDE no lo calcula hoy.
//   · vida restante / % de desgaste de la herramienta — no hay modelo validado.
//   El propio motor devuelve `{"status": "not_evaluated", "reason":
//   "no_validated_model"}` para calidad superficial y productividad; inventar
//   un número aquí sería justo lo que el motor se niega a hacer.
//
// Sin React, sin Zustand, sin fetch.
// ─────────────────────────────────────────────────────────────────────────────

// ── Contrato serializado (mde/output.py) ────────────────────────────────────

/** Estado de la consulta al MDE (cam_builder.MDE_ESTADO_*). */
export type EstadoConsultaMDE = "ok" | "mde_unavailable";

/** OperationStatus del motor (mde/recommendation.py). */
export type EstadoOperacionMDE =
  | "required"
  | "optional"
  | "likely_already_done"
  | "not_applicable";

export interface HechoMDE {
  rule_id: string;
  code: string;
  data: Record<string, any>;
  conclusion: Record<string, any>;
  based_on: string[];
}

export interface RecomendacionMDE {
  /** FeatureType del motor: "planeado" | "cajera" | "taladrado" | … */
  operation: string;
  status: EstadoOperacionMDE;
  confidence: number;
  /** Solo NOT_APPLICABLE llega en false. */
  presented: boolean;
  default_checked: boolean;
  was_conflict: boolean;
  evidence: HechoMDE[];
}

export interface ConflictoMDE {
  operation: string;
  principle: string;
  resolved_status: string;
  competing: Array<{ status: string; rule_id: string; code: string }>;
}

export interface ResumenRazonamientoMDE {
  rules_participated: string[];
  conflicts: ConflictoMDE[];
}

/**
 * Una entrada por setup. El motor multi-setup devuelve un ARRAY:
 * `[{ setup: "OP10", status: "ok", recommendations: [...], summary: {...} }, …]`
 * (freecad_service._handle_generate_multi). Cuando la consulta falló, la
 * entrada trae `status: "mde_unavailable"` y su `reason` — se muestra el motivo
 * del motor, nunca un texto inventado.
 */
export interface RespuestaMDESetup {
  setup: string;
  status: EstadoConsultaMDE;
  reason?: string;
  recommendations?: RecomendacionMDE[];
  summary?: ResumenRazonamientoMDE;
}

// ── Códigos de hecho (mde/rules.py, mde/tooling.py, mde/conflict.py) ────────

export const HECHO = {
  MATERIAL_SOBRANTE: "material_allowance_present",
  CONTEXTO_PROCESO_PREVIO: "context_suggests_prior_process",
  AGUJERO_REQUIERE_TALADRO: "hole_requires_drilling",
  BROCA_EXCEDE_AGUJERO: "drill_diameter_exceeds_hole",
  PUNTA_CENTROS_EXCEDE: "center_drill_point_exceeds_hole",
  FRESA_EXCEDE_ANCHO: "end_mill_exceeds_feature_width",
  BROCA_PREVIA_ROSCA: "tap_drill_diameter_computed",
  RELACION_LD: "length_to_diameter_ratio_flagged",
  FAMILIA_IDEAL: "ideal_tool_type_for_operation",
  IDEAL_DISPONIBLE: "ideal_tool_available",
  IDEAL_EN_MANTENIMIENTO: "ideal_tool_in_maintenance",
  IDEAL_NO_DISPONIBLE: "ideal_tool_not_available",
  ALTERNATIVA_VIABLE: "viable_alternative_tool",
  CONFLICTO_RESUELTO: "conflict_resolved",
} as const;

// ── Traducción de códigos ───────────────────────────────────────────────────
// Una frase corta por código. El motor manda el código; el texto es nuestro.

export const TEXTO_HECHO: Record<string, string> = {
  [HECHO.MATERIAL_SOBRANTE]: "Hay material medido por remover en esta región",
  [HECHO.CONTEXTO_PROCESO_PREVIO]:
    "El estado declarado de la pieza indica un proceso previo",
  [HECHO.AGUJERO_REQUIERE_TALADRO]: "El agujero no existe en el bruto",
  [HECHO.BROCA_EXCEDE_AGUJERO]: "La broca es más grande que el agujero",
  [HECHO.PUNTA_CENTROS_EXCEDE]:
    "La punta de la broca de centros excede el agujero",
  [HECHO.FRESA_EXCEDE_ANCHO]: "La fresa no entra en el ancho de la cajera",
  [HECHO.BROCA_PREVIA_ROSCA]: "Broca previa a la rosca calculada",
  [HECHO.RELACION_LD]: "Relación longitud/diámetro señalada",
  [HECHO.FAMILIA_IDEAL]: "Familia de herramienta que pide la operación",
  [HECHO.IDEAL_DISPONIBLE]: "La herramienta ideal está en el inventario",
  [HECHO.IDEAL_EN_MANTENIMIENTO]:
    "La herramienta ideal existe pero está en mantenimiento",
  [HECHO.IDEAL_NO_DISPONIBLE]: "No hay herramienta ideal utilizable",
  [HECHO.ALTERNATIVA_VIABLE]: "Alternativa viable en el inventario",
  [HECHO.CONFLICTO_RESUELTO]: "Dos reglas discreparon y se resolvió el conflicto",
};

export const TEXTO_VENTAJA: Record<string, string> = {
  correct_tool_family: "familia correcta",
  matches_hole_diameter: "coincide con el Ø del agujero",
  matches_thread_major: "coincide con el Ø de la rosca",
  fits_within_feature_width: "entra en el ancho",
  single_tool_covers_size_range: "una sola herramienta cubre varios tamaños",
};

export const TEXTO_LIMITACION: Record<string, string> = {
  drill_diameter_exceeds_hole: "la broca excede el agujero",
  end_mill_exceeds_pocket_width: "la fresa excede el ancho de la cajera",
  undersize_requires_boring_or_interpolation:
    "queda corta: requiere mandrinado o interpolación",
  requires_helical_interpolation: "requiere interpolación helicoidal",
  requires_pre_drill: "requiere taladro previo",
  single_point_slower: "corte de un solo filo",
  smaller_diameter_more_passes: "Ø menor: más pasadas",
  smaller_effective_width_more_passes: "ancho efectivo menor: más pasadas",
  different_tool_family: "no es la familia propia de la operación",
  manual_angle_setup: "hay que ajustar el ángulo a mano",
};

export const TEXTO_RIESGO: Record<string, string> = {
  increased_deflection_small_diameter: "más flexión por Ø pequeño",
};

export const TEXTO_ESTADO: Record<EstadoOperacionMDE, string> = {
  required: "Necesaria",
  optional: "Opcional",
  likely_already_done: "Probablemente ya hecha",
  not_applicable: "No aplica",
};

/** Ø texto de un código sin traducción: se muestra el código, nunca un invento. */
export function textoDe(tabla: Record<string, string>, codigo: string): string {
  return tabla[codigo] ?? codigo;
}

// ── Estado de la fila (color del borde izquierdo de la lista) ───────────────
//
// verde = lista · ámbar = revisar · rojo = sin herramienta.
// El rojo y el ámbar salen de la DISPONIBILIDAD que reportó el motor; el estado
// de la operación solo puede degradar a ámbar. No se inventa ningún criterio
// propio: si no hay recomendación, no hay color de estado.
export type EstadoFila = "lista" | "revisar" | "sin_herramienta" | "sin_analisis";

export const ESTADO_FILA_BORDE: Record<EstadoFila, string> = {
  lista: "border-l-green-500",
  revisar: "border-l-amber-500",
  sin_herramienta: "border-l-red-500",
  sin_analisis: "border-l-border",
};

export const ESTADO_FILA_TEXTO: Record<EstadoFila, string> = {
  lista: "Lista",
  revisar: "Revisar",
  sin_herramienta: "Sin herramienta",
  sin_analisis: "Sin análisis",
};

export function estadoFila(rec: RecomendacionMDE | null): EstadoFila {
  if (!rec) return "sin_analisis";
  const ideal = herramientaIdeal(rec);
  if (ideal?.disponibilidad === "no_disponible") return "sin_herramienta";
  if (ideal?.disponibilidad === "en_mantenimiento") return "revisar";
  if (rec.status !== "required") return "revisar";
  if (rec.was_conflict) return "revisar";
  return "lista";
}

// ── Traducción tipo de operación de la UI → `operation` del MDE ─────────────
//
// OJO, es la clave de todo el cruce: el motor identifica una recomendación por
// el FeatureType (`_operation_of` devuelve `feature.feature_type.value`), NO por
// el id de la operación. Es decir, la recomendación es POR TIPO dentro de un
// setup, y todas las operaciones de ese tipo comparten la misma.
const OPERACION_MDE_POR_TIPO: Record<string, string> = {
  planeado: "planeado",
  cajera: "cajera",
  cajera_circular: "cajera",
  taladrado: "taladrado",
  contorneado_exterior: "contorneado",
  contorneado: "contorneado",
  roscado: "roscado",
  chaflan: "chaflan",
};

export function operacionMDEDe(tipo: string): string {
  return OPERACION_MDE_POR_TIPO[tipo] ?? tipo;
}

// ── ToolType del MDE → familia de la librería paramétrica ──────────────────
//
// El nombre del ToolType del motor y el de la familia del catálogo NO siempre
// coinciden (`fresa_planeado` vs `fresa_planeadora`, `macho` vs `macho_roscar`).
// Una familia sin constructor propio devuelve null y NO se dibuja: pintarla con
// la fresa plana de reserva sería enseñar una herramienta que no es la que el
// MDE recomendó.
const FAMILIA_POR_TOOL_TYPE: Record<string, string> = {
  fresa_plana: "fresa_plana",
  fresa_planeado: "fresa_planeadora",
  broca: "broca",
  macho: "macho_roscar",
  fresa_chaflan: "fresa_chaflan",
  barra_mandrinar: "barra_mandrinar",
  broca_centros: "broca_centros",
  // fresa_roscar: sin constructor en lib/geometry/herramientas → no se dibuja.
};

export function familiaDeToolType(toolType?: string | null): string | null {
  if (!toolType) return null;
  return FAMILIA_POR_TOOL_TYPE[toolType] ?? null;
}

/** Nombre en español de un ToolType del motor (para la ficha, sin render). */
export const NOMBRE_TOOL_TYPE: Record<string, string> = {
  fresa_plana: "Fresa plana",
  fresa_planeado: "Fresa planeadora",
  broca: "Broca",
  macho: "Macho de roscar",
  fresa_chaflan: "Fresa de chaflán",
  barra_mandrinar: "Barra de mandrinar",
  broca_centros: "Broca de centros",
  fresa_roscar: "Fresa de roscar",
};

export function nombreToolType(toolType?: string | null): string {
  if (!toolType) return "—";
  return NOMBRE_TOOL_TYPE[toolType] ?? toolType;
}

// ── Índice: (setup, tipo de operación) → recomendación ─────────────────────

export type IndiceMDE = Map<string, RecomendacionMDE>;

const claveIndice = (setup: number, operacion: string) => `${setup}|${operacion}`;

/**
 * El motor nombra los setups OP10 / OP20 según el ORDEN que eligió el operador
 * (cam_routes.generate_gcode): con "superior_primero" OP10 es el setup 1; con
 * "inferior_primero" OP10 es el setup 2. Sin esta traducción las
 * recomendaciones del segundo setup se pegarían a las operaciones del primero.
 */
export function setupDeNombre(nombre: string, ordenSetups: string): number | null {
  const invertido = ordenSetups === "inferior_primero" || ordenSetups === "solo_inferior";
  if (nombre === "OP10") return invertido ? 2 : 1;
  if (nombre === "OP20") return invertido ? 1 : 2;
  return null;
}

export function indexarRecomendaciones(
  respuesta: RespuestaMDESetup[] | null,
  ordenSetups: string,
): IndiceMDE {
  const indice: IndiceMDE = new Map();
  if (!respuesta) return indice;

  for (const porSetup of respuesta) {
    const setup = setupDeNombre(porSetup.setup, ordenSetups);
    if (setup === null) continue;
    for (const rec of porSetup.recommendations ?? []) {
      indice.set(claveIndice(setup, rec.operation), rec);
    }
  }
  return indice;
}

export function recomendacionDe(
  indice: IndiceMDE,
  op: { tipo: string; setup: number },
): RecomendacionMDE | null {
  return indice.get(claveIndice(op.setup, operacionMDEDe(op.tipo))) ?? null;
}

/** El estado global de la consulta: `ok` solo si TODOS los setups respondieron. */
export function consultaFallida(
  respuesta: RespuestaMDESetup[] | null,
): RespuestaMDESetup | null {
  return respuesta?.find((r) => r.status !== "ok") ?? null;
}

// ── Lecturas de la evidencia ───────────────────────────────────────────────
// La herramienta ideal y las alternativas NO son campos de la recomendación:
// viajan dentro de los Facts que emitieron las reglas R10 y R11. Estas
// funciones solo los localizan y copian sus datos — no completan huecos.

export type DisponibilidadIdeal =
  | "disponible"
  | "en_mantenimiento"
  | "no_disponible";

export interface HerramientaIdealMDE {
  disponibilidad: DisponibilidadIdeal;
  /** Familias que el motor considera ideales para la operación (R9/R10). */
  familias: string[];
  /** ToolType de la pieza concreta que el motor emparejó. Ausente si no hay. */
  tipo?: string;
  /** Ø de esa pieza. Ausente si el motor no emparejó ninguna. */
  diametro_mm?: number;
  /** Ø de las ideales retenidas en mantenimiento (si ese es el caso). */
  diametros_mantenimiento?: number[];
}

export function herramientaIdeal(
  rec: RecomendacionMDE | null,
): HerramientaIdealMDE | null {
  if (!rec) return null;

  const hecho = rec.evidence.find(
    (h) =>
      h.code === HECHO.IDEAL_DISPONIBLE ||
      h.code === HECHO.IDEAL_EN_MANTENIMIENTO ||
      h.code === HECHO.IDEAL_NO_DISPONIBLE,
  );
  if (!hecho) return null;

  const familias: string[] = Array.isArray(hecho.data.ideal_tool_types)
    ? hecho.data.ideal_tool_types
    : [];

  if (hecho.code === HECHO.IDEAL_DISPONIBLE) {
    return {
      disponibilidad: "disponible",
      familias,
      tipo: hecho.data.matched_tool_type,
      diametro_mm: hecho.data.matched_diameter_mm,
    };
  }
  if (hecho.code === HECHO.IDEAL_EN_MANTENIMIENTO) {
    return {
      disponibilidad: "en_mantenimiento",
      familias,
      diametros_mantenimiento: Array.isArray(hecho.data.in_maintenance_diameters_mm)
        ? hecho.data.in_maintenance_diameters_mm
        : undefined,
    };
  }
  return { disponibilidad: "no_disponible", familias };
}

export interface AlternativaMDE {
  tool_type: string;
  diameter_mm: number;
  advantages: string[];
  limitations: string[];
  risks: string[];
  /**
   * Impacto en tiempo. El motor solo declara DIRECCIÓN ("increased") y su base;
   * los minutos necesitarían avances y velocidades que no están aquí. Cuando no
   * puede afirmarlo devuelve `{status:"not_evaluated"}` y no se muestra nada.
   */
  machining_time_impact?: Record<string, any>;
  surface_quality_impact?: Record<string, any>;
  productivity_impact?: Record<string, any>;
}

export function alternativasDe(rec: RecomendacionMDE | null): AlternativaMDE[] {
  if (!rec) return [];
  return rec.evidence
    .filter((h) => h.code === HECHO.ALTERNATIVA_VIABLE && h.data.alternative)
    .map((h) => h.data.alternative as AlternativaMDE);
}

/**
 * La limitación de una alternativa EN UNA LÍNEA (lo que pide la ficha). Se toma
 * la primera que reportó el motor; si no reportó ninguna, no hay línea.
 */
export function limitacionPrincipal(alt: AlternativaMDE): string | null {
  const codigo = alt.limitations?.[0];
  return codigo ? textoDe(TEXTO_LIMITACION, codigo) : null;
}

/**
 * Dirección del impacto en tiempo, SOLO si el motor la afirmó. `not_evaluated`
 * devuelve null: la ausencia de modelo se muestra como ausencia, no como cero.
 */
export function impactoTiempo(alt: AlternativaMDE): string | null {
  const impacto = alt.machining_time_impact;
  if (!impacto || impacto.status === "not_evaluated") return null;
  if (impacto.direction !== "increased") return null;
  const pasadas = impacto.geometric_pass_lower_bound;
  return pasadas != null
    ? `Más tiempo de mecanizado · mínimo ${pasadas} pasadas por geometría`
    : "Más tiempo de mecanizado";
}
