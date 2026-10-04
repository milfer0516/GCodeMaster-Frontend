// src/modules/cam/domain/montaje.ts
// ─────────────────────────────────────────────────────────────────────────────
// SECCIONES DEL PASO MONTAJE — reglas puras.
//
// Cada sección del panel de Montaje es UNA fila de REGLAS_MONTAJE: su grupo, su
// título, si es obligatoria, lo que le falta y la línea de resumen que se ve con
// la sección plegada. Todo texto que ve el operario sale de aquí como DATO, para
// que cualquier otro cliente (p. ej. un asistente) lea exactamente lo mismo.
//
// · faltantes(estado): lo que le falta a la sección, en palabras del operario.
//   Vacío = completa. Siempre vacío en las opcionales. La unión de todas es LA
//   condición para salir de Montaje (domain/pasos.ts → pendientesDeMontaje).
// · resumen(estado): una línea para la cabecera plegada.
//
// El contenido (el componente React de cada sección) NO vive aquí: este archivo
// es PURO (ni React, ni store, ni DOM). La fila se une a su componente en
// components/montaje/seccionesMontaje.ts.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ESTADOS_PIEZA,
  FORMA_LABEL,
  type EstadoPieza,
  type FormaStock,
} from "./contextoFabricacion";

/**
 * Foto PLANA (solo primitivos) de lo que las reglas necesitan leer. La arma
 * store/selectoresMontaje.ts desde el store.
 */
export interface EstadoMontaje {
  /** Estado de la pieza elegido; null = sin responder. */
  estadoPieza: EstadoPieza | null;
  /** Forma de lo que llega; null = sin declarar. */
  forma: FormaStock | null;
  faceIdApoyo: number | null;
  caraSellada: boolean;
  /** Nombre del utillaje; null = sin sujeción configurada. */
  nombreUtillaje: string | null;
  /** Cotas declaradas (envolvente); null = no declarada. */
  alturaInferiorMm: number | null;
  alturaSuperiorMm: number | null;
  alturaAmarreMm: number | null;
  hayMaquina: boolean;
  /** Elementos físicos colocados en la mesa; null = la pieza no se ha colocado. */
  elementosColocados: number | null;
  notas: string;
  /** Etiqueta del punto de datum elegido; null = sin elegir. */
  etiquetaDatum: string | null;
  wcs: string;
}

export type GrupoMontaje = "pieza" | "sosten" | "provisional";

/** Los grupos del panel, en orden, con el título que ve el operario. */
export const GRUPOS_MONTAJE: ReadonlyArray<{ id: GrupoMontaje; titulo: string }> =
  [
    { id: "pieza", titulo: "La pieza" },
    { id: "sosten", titulo: "Cómo se sostiene" },
    { id: "provisional", titulo: "Cero y corrector (provisional)" },
  ];

/** El contrato de una sección. `Contenido` lo pone la capa de UI. */
export interface SeccionMontaje<Contenido = unknown> {
  id: string;
  grupo: GrupoMontaje;
  titulo: string;
  obligatoria: boolean;
  faltantes: (estado: EstadoMontaje) => string[];
  resumen: (estado: EstadoMontaje) => string;
  /** Muestra un candado cuando la cara de apoyo está sellada. */
  bloqueadaTrasSellar?: boolean;
  /** Sin definir = siempre visible. */
  visible?: (estado: EstadoMontaje) => boolean;
  Contenido: Contenido;
}

export type ReglasSeccionMontaje = Omit<SeccionMontaje, "Contenido">;

const NINGUNO = (): string[] => [];

/**
 * Las cotas declaradas del amarre en una línea. Un único texto para el cuerpo
 * de la sección de sujeción y su cabecera plegada.
 */
export function resumirAlturas(
  alturas: {
    part_bottom_z_mm: number;
    part_top_z_mm?: number | null;
    fixture_top_z_mm?: number | null;
  } | null,
): string {
  const partes: string[] = [];
  if (alturas) {
    partes.push(`Cara inferior ${alturas.part_bottom_z_mm}mm`);
    if (alturas.part_top_z_mm != null)
      partes.push(`Cara superior ${alturas.part_top_z_mm}mm`);
    if (alturas.fixture_top_z_mm != null)
      partes.push(`Amarre hasta ${alturas.fixture_top_z_mm}mm`);
  }
  return partes.join(" · ");
}

export const REGLAS_MONTAJE = [
  {
    id: "llegada",
    grupo: "pieza",
    titulo: "¿Cómo llega la pieza?",
    obligatoria: true,
    faltantes: (e) => [
      ...(e.estadoPieza === null ? ["cómo llega la pieza"] : []),
      ...(e.forma === null ? ["forma"] : []),
    ],
    resumen: (e) => {
      const estado =
        ESTADOS_PIEZA.find((c) => c.id === e.estadoPieza)?.titulo ??
        "Estado sin responder";
      const forma = e.forma ? FORMA_LABEL[e.forma] : "Forma sin declarar";
      return `${estado} · ${forma}`;
    },
  },
  {
    id: "cara-apoyo",
    grupo: "sosten",
    titulo: "Cara de apoyo",
    obligatoria: true,
    bloqueadaTrasSellar: true,
    faltantes: (e) => (e.caraSellada ? [] : ["cara sellada"]),
    resumen: (e) => {
      if (e.caraSellada) return `Cara ${e.faceIdApoyo} · queda fija al avanzar`;
      if (e.faceIdApoyo !== null)
        return `Cara ${e.faceIdApoyo} elegida · sin establecer`;
      return "Sin elegir";
    },
  },
  {
    id: "sujecion",
    grupo: "sosten",
    titulo: "Utillaje y sujeción",
    obligatoria: true,
    faltantes: (e) => (e.nombreUtillaje === null ? ["sujeción"] : []),
    resumen: (e) => {
      if (e.nombreUtillaje === null) return "Falta configurar la sujeción";
      const alturas = resumirAlturas(
        e.alturaInferiorMm === null
          ? null
          : {
              part_bottom_z_mm: e.alturaInferiorMm,
              part_top_z_mm: e.alturaSuperiorMm,
              fixture_top_z_mm: e.alturaAmarreMm,
            },
      );
      return alturas
        ? `${e.nombreUtillaje} · ${alturas}`
        : `${e.nombreUtillaje} · faltan las alturas`;
    },
  },
  {
    id: "colocacion",
    grupo: "sosten",
    titulo: "Colocación en la mesa",
    obligatoria: false,
    faltantes: NINGUNO,
    resumen: (e) =>
      e.elementosColocados === null
        ? "Sin colocar"
        : `Pieza colocada · ${e.elementosColocados} elemento(s)`,
    // La mesa sale de la máquina registrada: sin ella no hay editor.
    visible: (e) => e.hayMaquina,
  },
  {
    id: "notas",
    grupo: "sosten",
    titulo: "Notas de montaje",
    obligatoria: false,
    faltantes: NINGUNO,
    resumen: (e) => e.notas.trim().split("\n")[0] || "Sin notas",
  },
  {
    id: "cero",
    grupo: "provisional",
    titulo: "Cero y corrector",
    obligatoria: false,
    faltantes: NINGUNO,
    resumen: (e) => `${e.etiquetaDatum ?? "Sin elegir"} · ${e.wcs}`,
  },
] as const satisfies readonly ReglasSeccionMontaje[];

export type IdSeccionMontaje = (typeof REGLAS_MONTAJE)[number]["id"];

export type EstadoSeccion = "completa" | "pendiente" | "opcional";

/** La palabra de estado de la cabecera (nunca solo color). */
export const ETIQUETA_ESTADO_SECCION: Record<EstadoSeccion, string> = {
  completa: "Completa",
  pendiente: "Pendiente",
  opcional: "Opcional",
};

export function estadoDeSeccion(
  seccion: ReglasSeccionMontaje,
  estado: EstadoMontaje,
): EstadoSeccion {
  if (!seccion.obligatoria) return "opcional";
  return seccion.faltantes(estado).length === 0 ? "completa" : "pendiente";
}

export function seccionVisible(
  seccion: ReglasSeccionMontaje,
  estado: EstadoMontaje,
): boolean {
  return seccion.visible?.(estado) ?? true;
}

/** Todo lo que falta para salir de Montaje, en el orden del registro. */
export function faltantesDeMontaje(estado: EstadoMontaje): string[] {
  return REGLAS_MONTAJE.flatMap((s) => s.faltantes(estado));
}

/** La sección que se abre al entrar: la primera obligatoria con faltantes. */
export function seccionInicialMontaje(
  estado: EstadoMontaje,
): IdSeccionMontaje | null {
  const primera = REGLAS_MONTAJE.find(
    (s) =>
      seccionVisible(s, estado) &&
      estadoDeSeccion(s, estado) === "pendiente",
  );
  return primera?.id ?? null;
}
