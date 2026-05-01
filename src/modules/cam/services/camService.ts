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
