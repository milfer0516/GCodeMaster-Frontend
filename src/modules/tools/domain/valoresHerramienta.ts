// src/modules/tools/domain/valoresHerramienta.ts
// ─────────────────────────────────────────────────────────────────────────────
// DOMINIO PURO — el "estado del formulario" y sus conversiones.
//
// Un único tipo de valores sirve a los TRES modos (crear / editar / ver) y a
// las dos rutas de entrada (catálogo / herramienta nueva). Todo son strings
// porque vienen de <input>; las conversiones a número viven aquí y no en la UI.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  DefinicionDetalle,
  DefinicionResumen,
  Instancia,
  LibreriaEntrada,
  DefinicionPersonalizadaPayload,
} from "../../../services/toolingService";
import type { ParametrosHerramienta } from "../../../lib/geometry/herramientas/parametros";
import { campoAplica, type ClaveCampo } from "./camposFamilia";

export interface ValoresHerramienta {
  // ── Definición (catálogo / librería) ──
  familia: string;
  nombre: string;
  material: string;
  recubrimiento: string;
  norma: string;
  serie: string;
  diametro_mm: string;
  largo_filo_mm: string;
  largo_total_mm: string;
  numero_filos: string;
  radio_esquina_mm: string;
  angulo_grados: string;
  numero_insertos: string;
  designacion_inserto: string;
  designacion_rosca: string;
  paso_rosca_mm: string;
  // ── Pieza física (instancia) ──
  longitud_util_real_mm: string;
  codigo_interno: string;
  posicion_carrusel: string;
  portaherramienta_real: string;
  estado: string;
  costo_compra: string;
  marca: string;
  referencia_fabricante: string;
  notas: string;
}

const s = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "" : String(v);

export function valoresVacios(familia = ""): ValoresHerramienta {
  return {
    familia,
    nombre: "",
    material: "",
    recubrimiento: "",
    norma: "",
    serie: "",
    diametro_mm: "",
    largo_filo_mm: "",
    largo_total_mm: "",
    numero_filos: "",
    radio_esquina_mm: "",
    angulo_grados: "",
    numero_insertos: "",
    designacion_inserto: "",
    designacion_rosca: "",
    paso_rosca_mm: "",
    longitud_util_real_mm: "",
    codigo_interno: "",
    posicion_carrusel: "",
    portaherramienta_real: "",
    estado: "disponible",
    costo_compra: "",
    marca: "",
    referencia_fabricante: "",
    notas: "",
  };
}

/** Definición del catálogo (resumen o detalle) → valores del formulario. */
export function desdeDefinicion(
  def: DefinicionResumen | DefinicionDetalle,
): ValoresHerramienta {
  const d = def as Partial<DefinicionDetalle> & DefinicionResumen;
  return {
    ...valoresVacios(),
    familia: s(d.familia),
    nombre: s(d.nombre),
    material: s(d.material),
    recubrimiento: s(d.recubrimiento),
    norma: s(d.norma),
    serie: s(d.serie),
    diametro_mm: s(d.diametro_mm),
    largo_filo_mm: s(d.largo_filo_mm),
    largo_total_mm: s(d.largo_total_mm),
    numero_filos: s(d.numero_filos),
    radio_esquina_mm: s(d.radio_esquina_mm),
    angulo_grados: s(d.angulo_grados),
    numero_insertos: s(d.numero_insertos),
    designacion_inserto: s(d.designacion_inserto),
    designacion_rosca: s(d.designacion_rosca),
    paso_rosca_mm: s(d.paso_rosca_mm),
  };
}

/**
 * Instancia física + su entrada de librería → valores del formulario.
 * La instancia solo trae familia/nombre/Ø/material; la geometría completa vive
 * en la definición efectiva de la librería, por eso hacen falta las dos.
 */
export function desdeInstancia(
  inst: Instancia,
  entrada?: LibreriaEntrada | null,
): ValoresHerramienta {
  const base = entrada
    ? desdeDefinicion({
        id_herramienta_global: entrada.id_herramienta_global ?? 0,
        familia: entrada.familia ?? "",
        nombre: entrada.alias || entrada.nombre || "",
        norma: entrada.norma,
        diametro_mm: entrada.diametro_mm ?? 0,
        numero_filos: entrada.numero_filos,
        material: entrada.material ?? "",
        recubrimiento: entrada.recubrimiento,
        serie: entrada.serie,
        largo_filo_mm: entrada.largo_filo_mm,
        largo_total_mm: entrada.largo_total_mm,
        radio_esquina_mm: entrada.radio_esquina_mm,
        angulo_grados: entrada.angulo_grados,
        tipo_portaherramienta: entrada.tipo_portaherramienta,
        designacion_inserto: entrada.designacion_inserto,
        numero_insertos: entrada.numero_insertos,
        designacion_rosca: entrada.designacion_rosca,
        paso_rosca_mm: entrada.paso_rosca_mm,
        descripcion: entrada.descripcion,
        activo: entrada.activo,
      })
    : valoresVacios();

  return {
    ...base,
    familia: s(inst.familia) || base.familia,
    nombre: s(inst.nombre) || base.nombre,
    material: s(inst.material) || base.material,
    diametro_mm: s(inst.diametro_mm) || base.diametro_mm,
    longitud_util_real_mm: s(inst.longitud_util_real_mm),
    codigo_interno: s(inst.codigo_interno),
    posicion_carrusel: s(inst.posicion_carrusel),
    portaherramienta_real: s(inst.portaherramienta_real),
    estado: s(inst.estado) || "disponible",
    costo_compra: s(inst.costo_compra),
    marca: s(inst.marca),
    referencia_fabricante: s(inst.referencia_fabricante),
    notas: s(inst.notas),
  };
}

const n = (v: string): number | undefined => {
  if (!v.trim()) return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
};

/**
 * Valores del formulario → parámetros del constructor de geometría (CAPA 2).
 * Aquí termina el acoplamiento entre la UI y la librería: a partir de este
 * punto solo viajan números.
 */
export function aParametrosGeometria(
  v: ValoresHerramienta,
): Omit<ParametrosHerramienta, "familia"> {
  return {
    diametro_mm: n(v.diametro_mm),
    largo_filo_mm: n(v.largo_filo_mm),
    largo_total_mm: n(v.largo_total_mm),
    numero_filos: n(v.numero_filos),
    radio_esquina_mm: n(v.radio_esquina_mm),
    angulo_grados: n(v.angulo_grados),
    numero_insertos: n(v.numero_insertos),
    designacion_inserto: v.designacion_inserto || null,
    designacion_rosca: v.designacion_rosca || null,
    paso_rosca_mm: n(v.paso_rosca_mm),
    longitud_util_mm: n(v.longitud_util_real_mm),
    material: v.material || null,
    recubrimiento: v.recubrimiento || null,
  };
}

/**
 * Valores → payload de definición personalizada (Tier 2). Solo se envían los
 * campos técnicos que APLICAN a la familia: mandar radio de esquina en una
 * broca sería basura en la librería de la empresa.
 */
export function aDefinicionPersonalizada(
  v: ValoresHerramienta,
): DefinicionPersonalizadaPayload {
  const incluir = (clave: ClaveCampo, valor: number | undefined) =>
    valor !== undefined && campoAplica(v.familia, clave) ? valor : undefined;

  return {
    familia: v.familia,
    nombre: v.nombre.trim(),
    diametro_mm: Number(v.diametro_mm),
    material: v.material,
    largo_filo_mm: incluir("largo_filo_mm", n(v.largo_filo_mm)),
    largo_total_mm: incluir("largo_total_mm", n(v.largo_total_mm)),
    numero_filos: incluir("numero_filos", n(v.numero_filos)),
    radio_esquina_mm: incluir("radio_esquina_mm", n(v.radio_esquina_mm)),
    angulo_grados: incluir("angulo_grados", n(v.angulo_grados)),
    paso_rosca_mm: incluir("paso_rosca_mm", n(v.paso_rosca_mm)),
    numero_insertos: incluir("numero_insertos", n(v.numero_insertos)),
    designacion_rosca: campoAplica(v.familia, "designacion_rosca")
      ? v.designacion_rosca || undefined
      : undefined,
    designacion_inserto: campoAplica(v.familia, "designacion_inserto")
      ? v.designacion_inserto || undefined
      : undefined,
    recubrimiento: v.recubrimiento || undefined,
    norma: v.norma || undefined,
    serie: v.serie || undefined,
  };
}

export interface ErrorValidacion {
  campo: keyof ValoresHerramienta;
  mensaje: string;
}

/** Mismas reglas que el backend, comprobadas antes para dar un mensaje claro. */
export function validarDefinicion(v: ValoresHerramienta): ErrorValidacion | null {
  if (!v.familia) return { campo: "familia", mensaje: "Elige la familia." };
  if (v.nombre.trim().length < 2)
    return { campo: "nombre", mensaje: "El nombre debe tener al menos 2 caracteres." };
  if (!v.material) return { campo: "material", mensaje: "Elige el material." };

  const d = n(v.diametro_mm);
  if (!d || d <= 0)
    return { campo: "diametro_mm", mensaje: "El diámetro debe ser mayor que 0." };

  const lf = n(v.largo_filo_mm);
  const lt = n(v.largo_total_mm);
  if (lf && lt && lt <= lf)
    return {
      campo: "largo_total_mm",
      mensaje: "La longitud total debe ser mayor que la de filo.",
    };

  if (campoAplica(v.familia, "designacion_rosca") && !v.designacion_rosca.trim())
    return {
      campo: "designacion_rosca",
      mensaje: "Indica la designación de rosca (ej: M10x1.5).",
    };

  return null;
}

/**
 * Reglas de la pieza FÍSICA. NINGÚN dato es obligatorio: registrar lo que el
 * taller tiene no puede fallar por no haber medido nada todavía.
 *
 * En concreto la longitud útil YA NO se pide aquí: es una decisión de montaje
 * de un trabajo concreto (la misma herramienta sale 20 mm hoy y 45 mm mañana),
 * y se captura en Operaciones. El campo sigue en ToolInstance.
 */
export function validarInstancia(v: ValoresHerramienta): ErrorValidacion | null {
  const costo = n(v.costo_compra);
  if (v.costo_compra.trim() && (costo === undefined || costo < 0))
    return { campo: "costo_compra", mensaje: "El costo no puede ser negativo." };

  return null;
}

export const aNumero = n;
