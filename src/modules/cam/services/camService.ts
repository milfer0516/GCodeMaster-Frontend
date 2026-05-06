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

export interface FaceMetadata {
  face_id: number;
  start: number; // índice inicial en buffer global de indices
  count: number; // cantidad de índices (triángulos × 3)
  surface_type: string; // plane | cylinder | cone | sphere | torus | other
  feature: any | null;
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

// ── Generar G-Code ────────────────────────────────────────────────────────
export async function generateGcode(payload: {
  archivo: File;
  idJob: number;
  operaciones: any[];
  herramientas: any[];
  materialKey: string;
  stockConfig: object;
  datumConfig: object;
  ordenSetups?: string;
  machineKey?: string;
}) {
  const form = new FormData();
  form.append("step_file", payload.archivo);
  form.append("id_job", String(payload.idJob));
  form.append("operaciones_json", JSON.stringify(payload.operaciones));
  form.append("herramientas_json", JSON.stringify(payload.herramientas));
  form.append("material_key", payload.materialKey);
  form.append("stock_json", JSON.stringify(payload.stockConfig));
  form.append("datum_json", JSON.stringify(payload.datumConfig));
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
