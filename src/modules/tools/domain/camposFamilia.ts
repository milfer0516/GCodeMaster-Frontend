// src/modules/tools/domain/camposFamilia.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — qué campos técnicos tiene sentido pedir en cada familia.
//
// Una broca no tiene número de filos que el operador deba elegir ni radio de
// esquina; un macho pide designación y paso; una planeadora pide número y
// designación de plaquita. Este módulo es la única fuente de esa regla, la
// consume el formulario y no depende de React.
//
// NO aparecen aquí Vc, fz, RPM ni avance: los parámetros de corte viven en el
// catálogo de materiales y en el motor CAM. Separación verificada, se mantiene.
// ─────────────────────────────────────────────────────────────────────────────

export type ClaveCampo =
  | "diametro_mm"
  | "largo_filo_mm"
  | "largo_total_mm"
  | "numero_filos"
  | "radio_esquina_mm"
  | "angulo_grados"
  | "numero_insertos"
  | "designacion_inserto"
  | "designacion_rosca"
  | "paso_rosca_mm";

export interface OpcionCampo {
  valor: string;
  etiqueta: string;
}

/**
 * Anchura natural del campo en el formulario. Un diámetro son 4 caracteres:
 * estirarlo de lado a lado de un panel de 24" no lo hace más legible, lo hace
 * más difícil de escanear. "corto" = 3 por fila, "medio" = 2, "largo" = 1 con
 * ancho máximo legible.
 */
export type AnchoCampo = "corto" | "medio" | "largo";

export interface DefinicionCampo {
  clave: ClaveCampo;
  etiqueta: string;
  tipo: "numero" | "texto" | "opciones";
  ancho?: AnchoCampo;
  /** Opciones cerradas (ángulos normalizados). */
  opciones?: OpcionCampo[];
  requerido?: boolean;
  paso?: number;
  min?: number;
  ayuda?: string;
  marcador?: string;
}

/** Campos aplicables por familia, en el orden en que se muestran. */
export const CAMPOS_POR_FAMILIA: Record<string, ClaveCampo[]> = {
  fresa_plana: ["diametro_mm", "numero_filos", "largo_filo_mm", "largo_total_mm"],
  fresa_esferica: ["diametro_mm", "numero_filos", "largo_filo_mm", "largo_total_mm"],
  fresa_radio: [
    "diametro_mm",
    "radio_esquina_mm",
    "numero_filos",
    "largo_filo_mm",
    "largo_total_mm",
  ],
  fresa_planeadora: [
    "diametro_mm",
    "numero_insertos",
    "designacion_inserto",
    "largo_total_mm",
  ],
  broca: ["diametro_mm", "angulo_grados", "largo_filo_mm", "largo_total_mm"],
  broca_centros: ["diametro_mm", "angulo_grados", "largo_total_mm"],
  macho_roscar: [
    "designacion_rosca",
    "paso_rosca_mm",
    "diametro_mm",
    "numero_filos",
    "largo_filo_mm",
  ],
  fresa_chaflan: [
    "diametro_mm",
    "angulo_grados",
    "numero_filos",
    "largo_total_mm",
  ],
  escariador: ["diametro_mm", "numero_filos", "largo_filo_mm", "largo_total_mm"],
  barra_mandrinar: ["diametro_mm", "designacion_inserto", "largo_total_mm"],
  cabezal_mandrinado: ["diametro_mm", "designacion_inserto", "largo_total_mm"],
};

const BASE: Record<ClaveCampo, DefinicionCampo> = {
  diametro_mm: {
    clave: "diametro_mm",
    etiqueta: "Diámetro (mm)",
    ancho: "corto",
    tipo: "numero",
    requerido: true,
    paso: 0.1,
    min: 0.1,
  },
  largo_filo_mm: {
    clave: "largo_filo_mm",
    etiqueta: "Longitud de filo (mm)",
    ancho: "corto",
    tipo: "numero",
    paso: 0.5,
    min: 0.1,
    ayuda: "Zona acanalada que realmente corta.",
  },
  largo_total_mm: {
    clave: "largo_total_mm",
    etiqueta: "Longitud total (mm)",
    ancho: "corto",
    tipo: "numero",
    paso: 0.5,
    min: 0.1,
  },
  numero_filos: {
    clave: "numero_filos",
    etiqueta: "Número de filos",
    ancho: "corto",
    tipo: "numero",
    paso: 1,
    min: 1,
  },
  radio_esquina_mm: {
    clave: "radio_esquina_mm",
    etiqueta: "Radio de esquina (mm)",
    ancho: "corto",
    tipo: "numero",
    paso: 0.1,
    min: 0.05,
  },
  angulo_grados: {
    clave: "angulo_grados",
    etiqueta: "Ángulo (°)",
    ancho: "medio",
    tipo: "opciones",
  },
  numero_insertos: {
    clave: "numero_insertos",
    etiqueta: "Número de plaquitas",
    ancho: "corto",
    tipo: "numero",
    paso: 1,
    min: 1,
  },
  designacion_inserto: {
    clave: "designacion_inserto",
    etiqueta: "Designación de plaquita",
    ancho: "medio",
    tipo: "texto",
    marcador: "Ej: APKT1604PDR",
    ayuda: "El tamaño se deduce de la designación ISO.",
  },
  designacion_rosca: {
    clave: "designacion_rosca",
    etiqueta: "Designación de rosca",
    ancho: "medio",
    tipo: "texto",
    requerido: true,
    marcador: "Ej: M10x1.5",
  },
  paso_rosca_mm: {
    clave: "paso_rosca_mm",
    etiqueta: "Paso (mm)",
    ancho: "corto",
    tipo: "numero",
    paso: 0.05,
    min: 0.1,
    ayuda: "Si lo dejas vacío se toma el paso grueso ISO.",
  },
};

/** Ángulos normalizados que se ofrecen en cada familia. */
const ANGULOS: Record<string, OpcionCampo[]> = {
  broca: [
    { valor: "118", etiqueta: "118° — uso general" },
    { valor: "135", etiqueta: "135° — autocentrante, inox" },
    { valor: "140", etiqueta: "140°" },
  ],
  broca_centros: [
    { valor: "60", etiqueta: "60° — DIN 333 forma A" },
    { valor: "90", etiqueta: "90°" },
  ],
  fresa_chaflan: [
    { valor: "45", etiqueta: "45°" },
    { valor: "60", etiqueta: "60°" },
    { valor: "90", etiqueta: "90°" },
  ],
};

const ETIQUETAS_ANGULO: Record<string, string> = {
  broca: "Ángulo de punta",
  broca_centros: "Ángulo de avellanado",
  fresa_chaflan: "Ángulo incluido",
};

/**
 * Campos que aplican a la familia, ya resueltos (etiquetas y opciones
 * dependientes de la familia incluidas). Familia desconocida → los campos
 * genéricos de una fresa.
 */
export function camposDeFamilia(familia?: string | null): DefinicionCampo[] {
  const claves: ClaveCampo[] =
    (familia ? CAMPOS_POR_FAMILIA[familia] : undefined) ??
    CAMPOS_POR_FAMILIA.fresa_plana;

  return claves.map((clave) => {
    const base = BASE[clave];
    if (clave !== "angulo_grados" || !familia) return base;
    return {
      ...base,
      etiqueta: `${ETIQUETAS_ANGULO[familia] ?? base.etiqueta} (°)`,
      opciones: ANGULOS[familia],
    };
  });
}

/** ¿Este campo aplica a esta familia? Útil para filtrar payloads. */
export function campoAplica(familia: string, clave: ClaveCampo): boolean {
  return (CAMPOS_POR_FAMILIA[familia] ?? []).includes(clave);
}
