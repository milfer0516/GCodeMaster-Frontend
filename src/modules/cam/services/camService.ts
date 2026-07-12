// src/modules/cam/services/camService.ts
import { api } from "../../../services/api";

export interface MaterialGlobal {
  id_material: number;
  nombre: string;
  grupo_iso: string;
  categoria: string;
  dureza_hb: number | null;
  vc_min: number;
  vc_max: number;
  fz_min: number;
  fz_max: number;
}

// ── Tipos del mesh OCC ────────────────────────────────────────────────────

export interface FeatureInfo {
  op_id: string | null;
  op_tipo: string | null;
  tipo: string | null;
  // Campos de dimensión que ahora envía el backend (todos opcionales)
  diametro_mm?: number;
  profundidad_mm?: number;
  dim_largo_mm?: number;
  dim_ancho_mm?: number;
  area_mm2?: number;
  angulo_grados?: number;
  radio_menor_mm?: number;
}

export interface FaceMetadata {
  face_id: number;
  start: number;
  count: number;
  surface_type: string;
  feature: FeatureInfo | null;
  face_normal: [number, number, number];
}

export interface MeshData {
  positions: number[]; // flat [x,y,z, ...]
  normals: number[]; // flat [nx,ny,nz, ...]
  indices: number[]; // flat [i,i,i, ...]
  faces: FaceMetadata[]; // metadata por cara para picking
  bounding_box: {
    min: number[];
    max: number[];
    center: number[];
  };
  stats: {
    total_faces: number;
    total_vertices: number;
    total_triangles: number;
    total_indices: number;
  };
}

// ── Analizar archivo STEP ─────────────────────────────────────────────────
export async function analyzeStep(archivo: File, idProyecto?: number) {
  const form = new FormData();
  form.append("file", archivo);
  if (idProyecto) form.append("id_proyecto", String(idProyecto));

  const { data } = await api.post("/cam/analyze", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Teselar archivo STEP → mesh OCC real ─────────────────────────────────
// Se llama después de analyzeStep, usando el mismo archivo en memoria.
// El backend FastAPI reenvía al contenedor FreeCAD /tessellate.
export async function tessellateStep(
  archivo: File,
  idJob: number,
): Promise<MeshData> {
  const form = new FormData();
  form.append("file", archivo);
  form.append("id_job", String(idJob));

  const { data } = await api.post("/cam/tessellate", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data as MeshData;
}

// ── Transform frontend StockConfig to engine's bruto_medido payload ──────
// Sends BOTH overall raw dimensions (what the operator bought/has) AND per-face
// raw distribution (how the excess actually sits). They complement each other:
// raw stock is almost never centered, so the per-face data is REAL MEASURED
// information, not a guess.
export function buildStockPayload(stockConfig: any): object {
  if (stockConfig.tipo === "rectangular") {
    const payload: any = {
      tipo: "bruto_medido",
      forma: "rectangular",
      ancho_bruto_mm: stockConfig.ancho_bruto_mm,
      largo_bruto_mm: stockConfig.largo_bruto_mm,
      alto_bruto_mm: stockConfig.alto_bruto_mm,
    };

    // Include per-face raw stock distribution if available (6 faces measured)
    if (Array.isArray(stockConfig.stockFaces) && stockConfig.stockFaces.length === 6) {
      payload.por_cara = {};
      stockConfig.stockFaces.forEach((face: any) => {
        payload.por_cara[face.direction] = face.allowance;
      });
    }

    return payload;
  } else {
    // cilindrico: uniform radial, no per-face granularity
    return {
      tipo: "bruto_medido",
      forma: "cilindrico",
      diametro_bruto_mm: stockConfig.diametro_bruto_mm,
      longitud_bruta_mm: stockConfig.longitud_bruta_mm,
    };
  }
}

// ── Generar G-Code ────────────────────────────────────────────────────────
export async function generateGcode(payload: {
  archivo: File;
  idJob: number;
  operaciones: any[];
  herramientas: any[];
  materialKey: string;
  stockConfig: object;
  datumConfig: object;
  montajeConfig: object;
  ordenSetups?: string;
  machineKey?: string;
}) {
  const form = new FormData();
  form.append("step_file", payload.archivo);
  form.append("id_job", String(payload.idJob));
  form.append("operaciones_json", JSON.stringify(payload.operaciones));
  form.append("herramientas_json", JSON.stringify(payload.herramientas));
  form.append("material_key", payload.materialKey);
  // Transform to engine's bruto_medido format
  const stockPayload = buildStockPayload(payload.stockConfig);
  form.append("stock_json", JSON.stringify(stockPayload));
  form.append("datum_json", JSON.stringify(payload.datumConfig));
  form.append("montaje_json", JSON.stringify(payload.montajeConfig));
  form.append("orden_setups", payload.ordenSetups ?? "superior_primero");
  if (payload.machineKey) form.append("machine_key", payload.machineKey);

  const { data } = await api.post("/cam/generate", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Obtener materiales globales ───────────────────────────────────────────
export async function getMateriales(): Promise<MaterialGlobal[]> {
  const { data } = await api.get("/materiales");
  return data;
}

// ── Obtener materiales por grupo ISO ─────────────────────────────────────
export async function getMaterialesPorGrupo(
  grupoIso: string,
): Promise<MaterialGlobal[]> {
  const { data } = await api.get(`/materiales/grupo/${grupoIso}`);
  return data;
}

// ── Asignar material al job ───────────────────────────────────────────────
export async function asignarMaterialJob(idJob: number, idMaterial: number) {
  const { data } = await api.put(`/cam/job/${idJob}/material`, {
    id_material: idMaterial,
  });
  return data;
}
