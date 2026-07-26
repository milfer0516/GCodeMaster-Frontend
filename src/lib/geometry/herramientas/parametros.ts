// src/lib/geometry/herramientas/parametros.ts
// ─────────────────────────────────────────────────────────────────────────────
// CAPA 2 · Normalización de parámetros — FUNCIONES PURAS.
//
// El formulario entrega lo que el operador haya escrito hasta el momento
// (campos vacíos, a medio escribir, absurdos). Aquí se convierte eso en un
// juego de cotas COHERENTE con el que cualquier constructor puede trabajar sin
// romperse. Nada de esto sabe de React: `resolverParametros({familia:"broca",
// diametro_mm:8})` funciona en un script plano.
//
// Los valores por defecto son de taller, no arbitrarios: una fresa se dibuja
// con 2.5×D de filo, una broca con 5×D, un escariador con 6 filos rectos, etc.
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que el formulario/catálogo puede aportar. Todo opcional salvo la familia. */
export interface ParametrosHerramienta {
  familia: string;
  diametro_mm?: number | null;
  largo_filo_mm?: number | null;
  largo_total_mm?: number | null;
  numero_filos?: number | null;
  radio_esquina_mm?: number | null;
  angulo_grados?: number | null;
  numero_insertos?: number | null;
  designacion_inserto?: string | null;
  designacion_rosca?: string | null;
  paso_rosca_mm?: number | null;
  /** Longitud útil MEDIDA de la pieza física (Tier 3): lo que sobresale del cono. */
  longitud_util_mm?: number | null;
  material?: string | null;
  recubrimiento?: string | null;
}

export interface ParametrosResueltos {
  familia: string;
  /** Diámetro de corte (mm). */
  D: number;
  /** Radio de corte (mm). */
  R: number;
  /** Longitud de filo / zona acanalada (mm). */
  Lc: number;
  /** Longitud total (mm). */
  Lt: number;
  /** Diámetro del mango (mm). */
  dMango: number;
  /** Diámetro del agujero de árbol (mm) — fresas de acoplamiento. */
  agujero: number;
  /** Número de filos / labios / canales. */
  filos: number;
  /** Radio de esquina (mm) — solo fresa_radio. */
  radioEsquina: number;
  /** Ángulo característico en grados (punta de broca, chaflán, avellanado). */
  angulo: number;
  /** Número de plaquitas (fresa planeadora). */
  insertos: number;
  /** Tamaño de plaquita en mm, deducido de la designación si es posible. */
  tamInserto: number;
  /** Paso de rosca (mm) — machos. */
  paso: number;
  /** Longitud expuesta fuera del portaherramientas (mm). */
  longitudExpuesta: number;
  /** true si el operador declaró una longitud útil real. */
  tieneLongitudUtil: boolean;
  material: string | null;
  recubrimiento: string | null;
}

// ── Utilidades numéricas ────────────────────────────────────────────────────

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};

const acotar = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

// ── Tablas de taller ────────────────────────────────────────────────────────

/** Paso grueso ISO métrico (mm) por diámetro nominal. */
export const PASO_GRUESO_ISO: Record<number, number> = {
  1: 0.25, 1.2: 0.25, 1.6: 0.35, 2: 0.4, 2.5: 0.45, 3: 0.5, 4: 0.7, 5: 0.8,
  6: 1.0, 7: 1.0, 8: 1.25, 10: 1.5, 12: 1.75, 14: 2.0, 16: 2.0, 18: 2.5,
  20: 2.5, 22: 2.5, 24: 3.0, 27: 3.0, 30: 3.5, 33: 3.5, 36: 4.0, 39: 4.0,
};

/**
 * Lee una designación de rosca métrica: "M10", "M10x1.5", "M 10 X 1,25".
 * Devuelve diámetro nominal y paso (paso grueso si no viene explícito).
 */
export function leerDesignacionRosca(
  designacion?: string | null,
): { diametro: number; paso: number } | null {
  if (!designacion) return null;
  const limpio = designacion.replace(/,/g, ".").toUpperCase();
  const m = limpio.match(/M\s*([0-9]+(?:\.[0-9]+)?)(?:\s*[X*]\s*([0-9]+(?:\.[0-9]+)?))?/);
  if (!m) return null;
  const diametro = Number(m[1]);
  if (!Number.isFinite(diametro) || diametro <= 0) return null;
  const pasoExplicito = m[2] ? Number(m[2]) : null;
  const paso =
    pasoExplicito && pasoExplicito > 0
      ? pasoExplicito
      : (PASO_GRUESO_ISO[diametro] ?? diametro * 0.15);
  return { diametro, paso };
}

/**
 * Tamaño de plaquita (mm) desde su designación ISO: los dos primeros dígitos
 * del grupo numérico dan la longitud del filo. "APKT1604PDR" → 16,
 * "SEKN1203AFTN" → 12, "SPMT090308" → 9.
 */
export function tamanoInsertoDesdeDesignacion(
  designacion?: string | null,
): number | null {
  if (!designacion) return null;
  const m = designacion.match(/(\d{4,6})/);
  if (!m) return null;
  const tam = Number(m[1].slice(0, 2));
  return Number.isFinite(tam) && tam > 0 ? tam : null;
}

// ── Defaults por familia ────────────────────────────────────────────────────

// ── Fresas planeadoras de plaquitas (tipo BAP400R / CoroMill 245) ───────────

/**
 * Altura del cuerpo de una fresa planeadora. NO es proporcional al diámetro:
 * en el catálogo real la altura se mantiene casi constante mientras el Ø crece,
 * así que una Ø40 es un tejo achaparrado y una Ø125 un disco ancho y plano.
 *
 * Referencias medidas (Sandvik CoroMill 245, misma familia constructiva):
 *   R245-050Q22 → Ø50  · H 40 mm   (relación 1.25)
 *   R245-080Q27 → Ø80  · H 50 mm   (relación 1.6)
 *   RA245-102R38 → Ø102 · H 50 mm  (relación 2.0)
 * El Ø se dobla y la altura solo pasa de 40 a 50: función MUY tendida.
 */
export function alturaCuerpoPlaneadora(diametro: number): number {
  return acotar(30 + 0.16 * diametro, 32, 63);
}

/**
 * Diámetro del agujero de árbol (bore). Un cabezal de planear se monta sobre
 * un árbol FMB: el cuerpo es un disco CON AGUJERO, no un cilindro macizo.
 * Tabla tomada de las referencias comerciales BAP400R D-d-nT:
 *   50-22 · 63-22 · 80-27 · 100-32 · 125-40 · 160-40
 */
export function agujeroArbolPlaneadora(diametro: number): number {
  if (diametro <= 36) return 16;
  if (diametro <= 63) return 22; // FMB22
  if (diametro <= 90) return 27; // FMB27
  if (diametro <= 110) return 32; // FMB32
  return 40; // FMB40
}

/**
 * Número de plaquitas por defecto. NUNCA 1: no existe comercialmente una
 * planeadora monodiente. Configuraciones reales: Ø40→4, Ø50→4/5, Ø63→4/5,
 * Ø80→5/6, Ø100→6/8, Ø125→6/8.
 */
export function insertosPorDefecto(diametro: number): number {
  return diametro <= 63 ? 4 : 6;
}

/** Familias que cortan con plaquita intercambiable, no con filo integral. */
export function esIndexable(familia: string): boolean {
  return (
    familia === "fresa_planeadora" ||
    familia === "barra_mandrinar" ||
    familia === "cabezal_mandrinado"
  );
}

/** Longitud de filo por defecto, en múltiplos de diámetro. */
function factorFilo(familia: string): number {
  switch (familia) {
    case "broca":
      // DIN 338 serie normal (jobber): Ø8.5 → 75 mm de canal (8.8·D),
      // Ø8.75 → 81 mm. Con 5·D la broca salía notablemente achaparrada.
      return 8.5;
    case "escariador":
      return 3;
    case "macho_roscar":
      return 2.2;
    case "fresa_chaflan":
      return 0.9;
    case "broca_centros":
      return 1.2;
    case "fresa_planeadora":
      return 0.5;
    case "barra_mandrinar":
      return 6;
    case "cabezal_mandrinado":
      return 1.2;
    default:
      return 2.5; // fresas de mango
  }
}

function filosPorDefecto(familia: string): number {
  switch (familia) {
    case "broca":
    case "fresa_esferica":
      return 2;
    case "broca_centros":
      return 2;
    case "macho_roscar":
      return 3;
    case "escariador":
      return 6;
    case "barra_mandrinar":
    case "cabezal_mandrinado":
      return 1;
    default:
      return 4;
  }
}

function anguloPorDefecto(familia: string): number {
  switch (familia) {
    case "broca":
      return 118; // ángulo de punta estándar
    case "broca_centros":
      return 60; // avellanado DIN 333 forma A
    case "fresa_chaflan":
      return 90; // ángulo incluido
    default:
      return 0;
  }
}

// ── Resolución ──────────────────────────────────────────────────────────────

/**
 * Convierte parámetros parciales del formulario en cotas coherentes.
 * PURA: mismos números dentro → mismos números fuera, sin efectos.
 */
export function resolverParametros(
  p: ParametrosHerramienta,
): ParametrosResueltos {
  const familia = p.familia || "fresa_plana";
  const rosca = leerDesignacionRosca(p.designacion_rosca);

  // Un macho M10 tiene Ø10 aunque el operador no haya escrito el diámetro.
  const D = acotar(num(p.diametro_mm) ?? rosca?.diametro ?? 10, 0.3, 400);
  const R = D / 2;

  const Lc = acotar(
    num(p.largo_filo_mm) ?? D * factorFilo(familia),
    D * 0.15,
    D * 25,
  );

  // Longitud total. En una fresa planeadora NO es "filo + mango": el cuerpo se
  // monta sobre un árbol y su altura apenas crece con el Ø (ver
  // alturaCuerpoPlaneadora). Aplicar aquí la regla de las fresas de mango daba
  // un cuerpo de 126 mm para una Ø63 — tres veces lo real.
  const LtPedida = num(p.largo_total_mm);
  const esPlaneadora = familia === "fresa_planeadora";
  const LtPorDefecto = esPlaneadora
    ? alturaCuerpoPlaneadora(D)
    : familia === "broca_centros"
      ? D * 6.5 // DIN 333: d2 = 8 mm → L = 50 mm
      : familia === "broca"
        ? Lc + Math.max(D * 5, 25) // DIN 338: L − l ≈ 5·D (Ø8.75 → 81/125)
        : Lc + Math.max(D * 1.5, 12);
  const Lt = esPlaneadora
    ? (LtPedida ?? LtPorDefecto)
    : LtPedida && LtPedida > Lc * 1.05
      ? LtPedida
      : LtPorDefecto;

  // Mangos normalizados: por debajo de Ø6 el mango es mayor que el corte.
  const dMango = acotar(Math.max(D, Math.min(6, D * 2)), 0.5, 60);

  // Agujero de árbol — solo tiene sentido en las fresas de acoplamiento.
  const agujero = agujeroArbolPlaneadora(D);

  const filos = acotar(
    Math.round(num(p.numero_filos) ?? filosPorDefecto(familia)),
    1,
    16,
  );

  const radioEsquina = acotar(
    num(p.radio_esquina_mm) ?? D * 0.1,
    D * 0.02,
    R * 0.85,
  );

  const angulo = acotar(
    num(p.angulo_grados) ?? anguloPorDefecto(familia),
    1,
    179,
  );

  // Nº de plaquitas. Antes de caer en el valor por defecto se acepta
  // `numero_filos`: muchos catálogos guardan ahí las plaquitas de una
  // herramienta indexable (BAP400R 80-27-6T se lista como "6 flutes"). Es una
  // regla de interpretación del DATO, no un parche del render.
  const insertos = acotar(
    Math.round(
      num(p.numero_insertos) ??
        (esIndexable(familia) ? num(p.numero_filos) : null) ??
        insertosPorDefecto(D),
    ),
    2, // nunca 1: no existe una planeadora monodiente
    16,
  );

  const tamInserto = acotar(
    tamanoInsertoDesdeDesignacion(p.designacion_inserto) ?? D * 0.22,
    2,
    Math.max(D * 0.45, 3),
  );

  const paso = acotar(
    num(p.paso_rosca_mm) ?? rosca?.paso ?? D * 0.15,
    0.15,
    D * 0.5,
  );

  // La longitud útil MEDIDA manda sobre el dibujo: es lo que hace que una
  // Ø12 con 8 mm útiles se vea achaparrada y el operador detecte el error.
  const util = num(p.longitud_util_mm);
  const tieneLongitudUtil = util !== null;
  const longitudExpuesta = tieneLongitudUtil
    ? acotar(util!, Lc * 1.02, Lt)
    : Lt;

  return {
    familia,
    D,
    R,
    Lc,
    Lt,
    dMango,
    agujero,
    filos,
    radioEsquina,
    angulo,
    insertos,
    tamInserto,
    paso,
    longitudExpuesta,
    tieneLongitudUtil,
    material: p.material ?? null,
    recubrimiento: p.recubrimiento ?? null,
  };
}
