// src/services/toolingService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sistema de herramientas de tres niveles (backend T1):
//
//   Tier 1  /tooling/catalogo    → catálogo global curado (95 definiciones)
//   Tier 2  /tooling/libreria    → definiciones adoptadas por la empresa
//   Tier 3  /tooling/instancias  → herramientas FÍSICAS de la empresa
//
// El operador NO escribe datos de catálogo: selecciona una definición y solo
// mide la longitud útil real de su herramienta física (Tier 3).
//
// NOTA: el modelo legacy `Herramienta` sigue existiendo en el backend porque
// Job.id_herramienta lo referencia, pero el frontend ya NO lo consume: este es
// el único servicio de herramientas. No se escriben filas espejo — el gate de
// setup cuenta instancias físicas (Tier 3).
// ─────────────────────────────────────────────────────────────────────────────
import { api } from "./api";

// ── Vocabulario (espejo de los enums del backend) ───────────────────────────

/**
 * Etiquetas legibles para el operador. Clave = familia del backend.
 * La LISTA de familias se pide a GET /tooling/catalogo/familias (fuente única);
 * aquí solo viven los nombres para mostrar, que el backend no expone.
 */
export const FAMILIA_LABEL: Record<string, string> = {
  fresa_plana: "Fresa plana",
  fresa_esferica: "Fresa esférica",
  fresa_radio: "Fresa de radio",
  fresa_planeadora: "Fresa planeadora",
  broca: "Broca",
  broca_centros: "Broca de centros",
  macho_roscar: "Macho de roscar",
  fresa_chaflan: "Fresa de chaflán",
  escariador: "Escariador",
  cabezal_mandrinado: "Cabezal de mandrinado",
  barra_mandrinar: "Barra de mandrinar",
};

export const MATERIALES_HERRAMIENTA = [
  "HSS",
  "HSSE",
  "Carburo",
  "Inserto",
] as const;

export const ESTADOS_INSTANCIA = [
  "disponible",
  "en_mantenimiento",
  "retirada",
] as const;

/**
 * Estados que el backend considera "en servicio". El gate de setup
 * (GET /empresas/me/setup-status, POST /empresas/me/completar-setup) cuenta
 * SOLO instancias en estos estados, así que el contador del onboarding debe
 * usar la misma regla para no contradecir al backend.
 */
export const ESTADOS_INSTANCIA_ACTIVOS = ["disponible", "en_mantenimiento"];

export function cuentaParaElMinimo(instancia: { estado: string }): boolean {
  return ESTADOS_INSTANCIA_ACTIVOS.includes(instancia.estado);
}

export const ESTADO_LABEL: Record<string, string> = {
  disponible: "Disponible",
  en_mantenimiento: "En mantenimiento",
  retirada: "Retirada",
};

export function familiaLabel(familia?: string | null): string {
  if (!familia) return "—";
  return FAMILIA_LABEL[familia] ?? familia;
}

/**
 * Mensaje de error legible a partir de una respuesta del backend.
 *
 * FastAPI devuelve `detail` como string en los HTTPException del router, pero
 * como ARRAY de objetos en los errores de validación (422). Renderizar ese
 * array directamente rompe React ("Objects are not valid as a React child"),
 * así que se aplana aquí.
 */
export function mensajeError(e: any, fallback: string): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const textos = detail
      .map((d: any) => (typeof d === "string" ? d : d?.msg))
      .filter(Boolean);
    if (textos.length > 0) return textos.join(". ");
  }
  return fallback;
}

// ── Tier 1 — Catálogo global ────────────────────────────────────────────────

export interface DefinicionResumen {
  id_herramienta_global: number;
  familia: string;
  nombre: string;
  norma: string | null;
  diametro_mm: number;
  numero_filos: number | null;
  material: string;
  recubrimiento: string | null;
  serie: string | null;
}

export interface DefinicionDetalle extends DefinicionResumen {
  largo_filo_mm: number | null;
  largo_total_mm: number | null;
  radio_esquina_mm: number | null;
  angulo_grados: number | null;
  tipo_portaherramienta: string | null;
  designacion_inserto: string | null;
  numero_insertos: number | null;
  designacion_rosca: string | null;
  paso_rosca_mm: number | null;
  descripcion: string | null;
  activo: boolean;
}

export interface FiltrosCatalogo {
  familia?: string;
  material?: string;
  diametro_min?: number;
  diametro_max?: number;
  q?: string;
}

export async function getFamilias(): Promise<string[]> {
  const { data } = await api.get("/tooling/catalogo/familias");
  return data.familias ?? [];
}

export async function getCatalogo(
  filtros: FiltrosCatalogo = {},
): Promise<DefinicionResumen[]> {
  const params = new URLSearchParams();
  if (filtros.familia) params.append("familia", filtros.familia);
  if (filtros.material) params.append("material", filtros.material);
  if (filtros.diametro_min !== undefined)
    params.append("diametro_min", String(filtros.diametro_min));
  if (filtros.diametro_max !== undefined)
    params.append("diametro_max", String(filtros.diametro_max));
  if (filtros.q) params.append("q", filtros.q);

  const qs = params.toString();
  const { data } = await api.get(`/tooling/catalogo${qs ? `?${qs}` : ""}`);
  return data.catalogo ?? [];
}

export async function getDefinicion(
  idHerramientaGlobal: number,
): Promise<DefinicionDetalle> {
  const { data } = await api.get(`/tooling/catalogo/${idHerramientaGlobal}`);
  return data;
}

// ── Tier 2 — Librería de la empresa ─────────────────────────────────────────

export interface LibreriaEntrada {
  id_herramienta_libreria: number;
  id_herramienta_global: number | null;
  es_personalizada: boolean;
  origen: string; // "catalogo" | "personalizada"
  alias: string | null;
  notas: string | null;
  activo: boolean;
  // Definición efectiva (resuelta desde el catálogo o desde campos propios)
  familia: string | null;
  nombre: string | null;
  norma: string | null;
  diametro_mm: number | null;
  largo_filo_mm: number | null;
  largo_total_mm: number | null;
  numero_filos: number | null;
  radio_esquina_mm: number | null;
  angulo_grados: number | null;
  serie: string | null;
  material: string | null;
  recubrimiento: string | null;
  tipo_portaherramienta: string | null;
  designacion_inserto: string | null;
  numero_insertos: number | null;
  designacion_rosca: string | null;
  paso_rosca_mm: number | null;
  descripcion: string | null;
}

export interface DefinicionPersonalizadaPayload {
  familia: string;
  nombre: string;
  diametro_mm: number;
  material: string;
  norma?: string;
  largo_filo_mm?: number;
  largo_total_mm?: number;
  numero_filos?: number;
  radio_esquina_mm?: number;
  angulo_grados?: number;
  serie?: string;
  recubrimiento?: string;
  tipo_portaherramienta?: string;
  designacion_rosca?: string;
  paso_rosca_mm?: number;
  descripcion?: string;
  alias?: string;
  notas?: string;
}

export async function getLibreria(filtros?: {
  familia?: string;
  solo_personalizadas?: boolean;
}): Promise<LibreriaEntrada[]> {
  const params = new URLSearchParams();
  if (filtros?.familia) params.append("familia", filtros.familia);
  if (filtros?.solo_personalizadas) params.append("solo_personalizadas", "true");
  const qs = params.toString();
  const { data } = await api.get(`/tooling/libreria${qs ? `?${qs}` : ""}`);
  return data.libreria ?? [];
}

export async function agregarDesdeCatalogo(
  idHerramientaGlobal: number,
  extra?: { alias?: string; notas?: string },
): Promise<LibreriaEntrada> {
  const { data } = await api.post("/tooling/libreria/desde-catalogo", {
    id_herramienta_global: idHerramientaGlobal,
    ...extra,
  });
  return data;
}

export async function crearDefinicionPersonalizada(
  payload: DefinicionPersonalizadaPayload,
): Promise<LibreriaEntrada> {
  const { data } = await api.post("/tooling/libreria/personalizada", payload);
  return data;
}

export async function eliminarEntradaLibreria(
  idHerramientaLibreria: number,
): Promise<void> {
  await api.delete(`/tooling/libreria/${idHerramientaLibreria}`);
}

/**
 * Devuelve la entrada de librería para una definición del catálogo, creándola
 * si aún no existe.
 *
 * El backend responde 409 cuando la definición YA está en la librería de la
 * empresa. Eso no es un error para el operador: significa que ya tiene una
 * herramienta de ese tipo y ahora está registrando una SEGUNDA pieza física.
 * Recuperamos la entrada existente para que la instancia se cuelgue de ella —
 * así conviven N instancias (cada una con su longitud útil medida) bajo una
 * misma definición.
 */
export async function asegurarEntradaLibreria(
  idHerramientaGlobal: number,
): Promise<LibreriaEntrada> {
  try {
    return await agregarDesdeCatalogo(idHerramientaGlobal);
  } catch (e: any) {
    if (e?.response?.status !== 409) throw e;
    const libreria = await getLibreria();
    const existente = libreria.find(
      (l) => l.id_herramienta_global === idHerramientaGlobal,
    );
    if (!existente) throw e;
    return existente;
  }
}

// ── Tier 3 — Herramientas físicas (instancias) ──────────────────────────────

export interface Instancia {
  id_herramienta_instancia: number;
  id_herramienta_libreria: number;
  codigo_interno: string | null;
  longitud_util_real_mm: number | null;
  horas_uso: number;
  posicion_carrusel: number | null;
  portaherramienta_real: string | null;
  estado: string;
  fecha_compra: string | null;
  fecha_registro: string;
  notas: string | null;
  activo: boolean;
  /**
   * Costo de compra de ESTA pieza física (opcional). Vive en la instancia, no
   * en la definición: dos fresas iguales compradas a proveedores distintos
   * cuestan distinto, y lo que la empresa querrá imputar por trabajo es el
   * costo real de la herramienta que se montó.
   */
  costo_compra?: number | null;
  // Definición efectiva que esta pieza física encarna
  familia: string | null;
  nombre: string | null;
  diametro_mm: number | null;
  material: string | null;
}

export interface InstanciaCreatePayload {
  id_herramienta_libreria: number;
  /** Longitud útil MEDIDA por el operador. Único dato manual del flujo. */
  longitud_util_real_mm?: number;
  codigo_interno?: string;
  posicion_carrusel?: number;
  portaherramienta_real?: string;
  estado?: string;
  notas?: string;
  /** Costo de compra de la pieza física (opcional). */
  costo_compra?: number;
}

export interface InstanciaUpdatePayload {
  longitud_util_real_mm?: number;
  codigo_interno?: string;
  posicion_carrusel?: number;
  portaherramienta_real?: string;
  estado?: string;
  horas_uso?: number;
  notas?: string;
  costo_compra?: number;
}

export async function getInstancias(filtros?: {
  estado?: string;
  id_herramienta_libreria?: number;
}): Promise<Instancia[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.append("estado", filtros.estado);
  if (filtros?.id_herramienta_libreria !== undefined)
    params.append(
      "id_herramienta_libreria",
      String(filtros.id_herramienta_libreria),
    );
  const qs = params.toString();
  const { data } = await api.get(`/tooling/instancias${qs ? `?${qs}` : ""}`);
  return data.instancias ?? [];
}

export async function crearInstancia(
  payload: InstanciaCreatePayload,
): Promise<Instancia> {
  const { data } = await api.post("/tooling/instancias", payload);
  return data;
}

export async function actualizarInstancia(
  idInstancia: number,
  payload: InstanciaUpdatePayload,
): Promise<Instancia> {
  const { data } = await api.put(`/tooling/instancias/${idInstancia}`, payload);
  return data;
}

/** Soft delete: el backend marca activo=false y estado="retirada". */
export async function eliminarInstancia(idInstancia: number): Promise<void> {
  await api.delete(`/tooling/instancias/${idInstancia}`);
}
