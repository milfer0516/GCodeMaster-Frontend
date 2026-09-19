// src/modules/cam/services/utillajesService.ts
// ─────────────────────────────────────────────────────────────────────────────
// API de UTILLAJES (amarres). Espejo tipado del contrato backend:
//
//   GET  /utillajes/                  → { total, utillajes: UtillajeResumen[] }
//   GET  /utillajes/familias          → { familias: FamiliaResumen[] }
//   GET  /utillajes/familias/{familia}→ FamiliaSchema (el SCHEMA del formulario)
//   GET  /utillajes/catalogo/global   → { total, catalogo: PlantillaGlobal[],
//                                        advertencia_general }
//   POST /utillajes/manual            → 201 MensajeUtillaje
//   POST /utillajes/desde-plantilla   → 201 MensajeUtillaje
//
// Verificado contra el backend (solo lectura):
//   app/schemas/utillaje_schema.py:61-144  (FamiliasResponse, CampoSchemaResponse,
//                                           FamiliaSchemaResponse, MensajeUtillaje,
//                                           UtillajeCrearManual,
//                                           UtillajeCrearDesdePlantilla)
//   app/schemas/utillaje_familias.py       (contenido de las familias)
//   app/routes/utillajes_routes.py:127-305 (rutas)
//
// REGLA DEL CONTRATO: el frontend NO declara ni un campo de ninguna familia.
// Este archivo solo tipa la FORMA de la respuesta; el contenido (qué campos
// tiene cada familia) se pide siempre al backend. Una familia nueva aparece
// sola, sin tocar el frontend.
// ─────────────────────────────────────────────────────────────────────────────
import { api } from "../../../services/api";

export type TipoCampoSchema =
  | "numero"
  | "opcion"
  | "opcion_multiple"
  | "texto"
  | "puntos_xy";

/** Un campo del formulario, tal como lo sirve el backend (CampoSchemaResponse). */
export interface CampoSchema {
  nombre: string; // la clave del JSON que hay que enviar
  etiqueta: string; // el texto del label — usarlo tal cual
  tipo: TipoCampoSchema;
  unidad: string | null; // "mm" o null; va junto al input
  obligatorio: boolean;
  opciones?: string[] | null; // solo opcion / opcion_multiple
  minimo?: number | null;
  maximo?: number | null;
  ayuda?: string | null;
  advertencia?: string | null; // se muestra SIEMPRE, bien visible
  visible_si?: { campo: string; igual_a: unknown } | null;
  // Clave estable de QUÉ se mide y desde dónde. Solo la llevan las tres cotas
  // medidas (part_bottom_z_mm / part_top_z_mm / fixture_top_z_mm) — son las
  // que viajan en sujecion_config.envolvente; el resto va a parametros_montaje.
  medida_desde?: string | null;
}

export interface FamiliaSchema {
  familia: string;
  etiqueta: string;
  descripcion: string;
  advertencias: string[];
  campos_utillaje: CampoSchema[];
  campos_montaje: CampoSchema[];
}

export interface FamiliaResumen {
  familia: string;
  etiqueta: string;
  descripcion: string;
}

/** Un utillaje del parque de la empresa (GET /utillajes/). */
export interface UtillajeResumen {
  id_utillaje: number;
  id_utillaje_global: number | null;
  nombre: string;
  familia: string;
  parametros: Record<string, unknown>;
  notas: string | null;
  fecha_registro: string;
  activo: boolean;
}

export async function getUtillajes(): Promise<UtillajeResumen[]> {
  const { data } = await api.get("/utillajes/");
  return data.utillajes ?? [];
}

export async function getFamiliasUtillaje(): Promise<FamiliaResumen[]> {
  const { data } = await api.get("/utillajes/familias");
  return data.familias ?? [];
}

export async function getFamiliaSchema(
  familia: string,
): Promise<FamiliaSchema> {
  const { data } = await api.get(
    `/utillajes/familias/${encodeURIComponent(familia)}`,
  );
  return data as FamiliaSchema;
}

// ── Catálogo global (las plantillas que el taller copia) ─────────────────────
// Espejo de PlantillaGlobalResponse / CatalogoGlobalResponse
// (utillaje_schema.py:42-58, servido en utillajes_routes.py:164-196).
export interface PlantillaGlobal {
  id_utillaje_global: number;
  familia: string;
  nombre: string;
  norma: string | null;
  parametros: Record<string, unknown>;
  advertencias: string[];
  descripcion: string | null;
}

export interface CatalogoGlobal {
  total: number;
  catalogo: PlantillaGlobal[];
  advertencia_general: string;
}

export async function getCatalogoGlobal(familia?: string): Promise<CatalogoGlobal> {
  const { data } = await api.get("/utillajes/catalogo/global", {
    params: familia ? { familia } : undefined,
  });
  return data as CatalogoGlobal;
}

// ── Registro de utillajes en el parque ───────────────────────────────────────
// Éxito: 201 MensajeUtillaje (utillaje_schema.py:100-104).
export interface MensajeUtillaje {
  mensaje: string;
  id_utillaje: number;
  nombre: string;
  familia: string;
}

/** POST /utillajes/manual — UtillajeCrearManual (utillaje_schema.py:110-120). */
export interface UtillajeCrearManualRequest {
  nombre: string;
  familia: string;
  // Claves = nombre de cada campo de campos_utillaje del schema de la familia.
  parametros: Record<string, unknown>;
  notas?: string;
}

/** POST /utillajes/desde-plantilla — UtillajeCrearDesdePlantilla
 *  (utillaje_schema.py:123-135). `parametros` se omite a propósito: sin él el
 *  backend copia las medidas de la plantilla tal cual (utillajes_routes.py:284). */
export interface UtillajeCrearDesdePlantillaRequest {
  id_utillaje_global: number;
  nombre?: string;
  notas?: string;
}

// ── Errores del contrato ─────────────────────────────────────────────────────
// 422 de validación de parámetros: detail = { mensaje, familia, errores:
// [{campo, motivo}] } (utillajes_routes.py:94-102). 404/400: detail = string.
// 422 de envoltura Pydantic: detail = [{loc, msg, type}].
export interface ErrorCampoUtillaje {
  campo: string;
  motivo: string;
}

export async function crearUtillajeManual(
  body: UtillajeCrearManualRequest,
): Promise<MensajeUtillaje> {
  const { data } = await api.post("/utillajes/manual", body);
  return data as MensajeUtillaje;
}

export async function crearUtillajeDesdePlantilla(
  body: UtillajeCrearDesdePlantillaRequest,
): Promise<MensajeUtillaje> {
  const { data } = await api.post("/utillajes/desde-plantilla", body);
  return data as MensajeUtillaje;
}
