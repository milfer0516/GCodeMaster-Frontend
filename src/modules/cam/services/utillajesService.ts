// src/modules/cam/services/utillajesService.ts
// ─────────────────────────────────────────────────────────────────────────────
// API de UTILLAJES (amarres). Espejo tipado del contrato backend:
//
//   GET /utillajes/                  → { total, utillajes: UtillajeResumen[] }
//   GET /utillajes/familias          → { familias: FamiliaResumen[] }
//   GET /utillajes/familias/{familia}→ FamiliaSchema (el SCHEMA del formulario)
//
// Verificado contra el backend (solo lectura):
//   app/schemas/utillaje_schema.py:61-97   (FamiliasResponse, CampoSchemaResponse,
//                                           FamiliaSchemaResponse)
//   app/schemas/utillaje_familias.py       (contenido de las familias)
//   app/routes/utillajes_routes.py:127-156 (rutas)
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
